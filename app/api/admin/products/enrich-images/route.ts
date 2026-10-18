import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isValidProductImageUrl,
  rehostProductImageToStorage,
  toAbsoluteUrl,
} from "@/lib/scraper/mediaHelper";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface HtmlImage {
  url: string;
  alt: string;
}

function extractImagesFromHtml(html: string, baseUrl: string): { url: string; alt: string }[] {
  const out: { url: string; alt: string }[] = [];
  const seen = new Set<string>();

  // og:image
  const ogMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:image["'][^>]*\scontent=["']([^"']+)["']/i
  );
  if (ogMatch?.[1]) {
    const abs = toAbsoluteUrl(ogMatch[1], baseUrl);
    if (abs && isValidProductImageUrl(abs)) {
      seen.add(abs);
      out.push({ url: abs, alt: "og_image" });
    }
  }

  const imgRe = /<img\b[^>]*>/gi;
  const srcRe = /\b(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i;
  const altRe = /\balt=["']([^"']*)["']/i;

  for (const m of html.matchAll(imgRe)) {
    const tag = m[0];
    const src = tag.match(srcRe)?.[1];
    if (!src) continue;
    const abs = toAbsoluteUrl(src, baseUrl);
    if (!abs || !isValidProductImageUrl(abs) || seen.has(abs)) continue;
    seen.add(abs);
    const alt = tag.match(altRe)?.[1] ?? "";
    out.push({ url: abs, alt });
  }

  return out;
}

async function fetchHtmlFast(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

async function searchOpenFoodFactsImage(
  productName: string,
  companyName: string
): Promise<string | null> {
  for (const query of [`${companyName} ${productName}`, productName]) {
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=5`;
      const res = await fetch(url, {
        headers: { "User-Agent": "FDXTrading/1.0 (https://fdx.trading)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        products?: Array<{
          image_front_url?: string;
          image_url?: string;
          product_name?: string;
        }>;
      };
      const items = data.products ?? [];
      for (const item of items) {
        const img = item.image_front_url || item.image_url;
        if (img && isValidProductImageUrl(img)) {
          return img;
        }
      }
    } catch {}
  }
  return null;
}

async function searchGoogleGroundedImage(
  productName: string,
  companyName: string,
  website: string | null
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Find a direct product photo URL (.jpg, .jpeg, .png, or .webp) for the food product "${productName}" manufactured by "${companyName}"${
        website ? ` (${website})` : ""
      }. Return ONLY the direct https:// image URL and nothing else.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });
    const text = response.text?.trim() ?? "";
    const candidates =
      text.match(/https?:\/\/[^\s"'<>)\]]+\.(?:jpe?g|png|webp)(?:\?[^\s"'<>)\]]*)?/gi) ?? [];
    for (const c of candidates) {
      if (!isValidProductImageUrl(c)) continue;
      try {
        const head = await fetch(c, {
          method: "HEAD",
          headers: { "User-Agent": USER_AGENT },
          redirect: "follow",
          signal: AbortSignal.timeout(4000),
        });
        const ct = (head.headers.get("content-type") ?? "").toLowerCase();
        if (head.ok && ct.startsWith("image/")) {
          return c;
        }
      } catch {}
    }
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { productIds?: string[] };
    const productIds = (body.productIds ?? []).slice(0, 25);

    if (productIds.length === 0) {
      return NextResponse.json({ ok: false, error: "No productIds provided" }, { status: 400 });
    }

    const { data: products, error } = await supabaseAdmin
      .from("supplier_products")
      .select(
        "id, product_name, category, supplier_id, image_url, supplier:supplier_offerings(company_name, website)"
      )
      .in("id", productIds);

    if (error || !products) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Cache candidate images per supplier website so we don't fetch the same site twice
    const siteImageCache = new Map<string, { url: string; alt: string }[]>();

    const updated: Record<string, string> = {};

    for (let i = 0; i < products.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = products[i] as any;
      const supplierObj = Array.isArray(p.supplier) ? p.supplier[0] : p.supplier;
      const companyName: string = supplierObj?.company_name ?? "";
      const website: string | null = supplierObj?.website ?? null;

      let chosenImageUrl: string | null = null;
      let imageSource = "website_crawl";

      // 1. Try supplier website HTML images first
      if (website) {
        let siteImages = siteImageCache.get(website);
        if (!siteImages) {
          siteImages = [];
          const base = /^https?:\/\//i.test(website.trim())
            ? website.trim()
            : `https://${website.trim()}`;
          for (const path of ["", "/products", "/our-products", "/catalogue", "/prodotti"]) {
            const targetUrl = toAbsoluteUrl(path, base);
            if (!targetUrl) continue;
            const html = await fetchHtmlFast(targetUrl);
            if (html) {
              siteImages.push(...extractImagesFromHtml(html, targetUrl));
            }
            if (siteImages.length >= 15) break;
          }
          siteImageCache.set(website, siteImages);
        }

        if (siteImages.length > 0) {
          const words = (p.product_name ?? "")
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((w: string) => w.length >= 3);
          const catWords = (p.category ?? "")
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((w: string) => w.length >= 3);

          let bestScore = 0;
          for (const img of siteImages) {
            const hay = `${img.url} ${img.alt}`.toLowerCase();
            let score = 0;
            for (const w of words) {
              if (hay.includes(w)) score += 3;
            }
            for (const cw of catWords) {
              if (hay.includes(cw)) score += 1;
            }
            if (score > bestScore) {
              bestScore = score;
              chosenImageUrl = img.url;
            }
          }

          // Fallback to first clean product image on their products page if only 1-3 images exist
          if (!chosenImageUrl && siteImages.length > 0) {
            const nonOg = siteImages.find((img) => img.alt !== "og_image") ?? siteImages[0];
            chosenImageUrl = nonOg.url;
          }
        }
      }

      // 2. Fallback: OpenFoodFacts product image search
      if (!chosenImageUrl) {
        chosenImageUrl = await searchOpenFoodFactsImage(p.product_name, companyName);
        if (chosenImageUrl) imageSource = "openfoodfacts";
      }

      // 3. Fallback: Gemini Google Search Grounding
      if (!chosenImageUrl) {
        chosenImageUrl = await searchGoogleGroundedImage(
          p.product_name,
          companyName,
          website
        );
        if (chosenImageUrl) imageSource = "google_search";
      }

      if (chosenImageUrl) {
        const hostedUrl = await rehostProductImageToStorage(
          p.supplier_id,
          chosenImageUrl,
          i
        );
        await supabaseAdmin
          .from("supplier_products")
          .update({ image_url: hostedUrl, image_source: imageSource })
          .eq("id", p.id);
        updated[p.id] = hostedUrl;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: products.length,
      foundCount: Object.keys(updated).length,
      updated,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
