import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ExtractedProduct } from "./extract";

const PRODUCT_BUCKET = "product-images";
const LOGO_BUCKET = "supplier-logos";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REJECT_PRODUCT_IMAGE_RE =
  /\b(logo|flag|icon|favicon|footer|header|banner|sprite|avatar|loader|placeholder|world-|badge|cert|iso-|sticky|facebook|instagram|linkedin|twitter|youtube|whatsapp|certific)\b/i;

const LOGO_URL_HINT_RE = /\b(logo|brand|identity|marque|header-logo|site-logo)\b/i;

export function toAbsoluteUrl(rawUrl: string | null | undefined, baseUrl: string | null | undefined): string | null {
  if (!rawUrl || !baseUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    const base = /^https?:\/\//i.test(baseUrl.trim())
      ? baseUrl.trim()
      : `https://${baseUrl.trim()}`;
    return new URL(trimmed, base).href;
  } catch {
    return null;
  }
}

export function getDomainFaviconUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const base = /^https?:\/\//i.test(website.trim())
      ? website.trim()
      : `https://${website.trim()}`;
    const u = new URL(base);
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
      `${u.protocol}//${u.hostname}`
    )}&size=128`;
  } catch {
    return null;
  }
}

export function isValidProductImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("data:")) return false;
  if (/\.svg(\?|#|$)/i.test(url)) return false;
  if (REJECT_PRODUCT_IMAGE_RE.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

export interface MarkdownImageCandidate {
  url: string;
  alt: string;
  context: string;
}

/**
 * Extracts all image candidates (`![alt](url)` and `OG_IMAGE: url`) from crawled markdown text.
 */
export function extractImagesFromCrawledContent(
  content: string,
  supplierWebsite: string | null
): {
  productImages: MarkdownImageCandidate[];
  logoCandidates: string[];
} {
  const productImages: MarkdownImageCandidate[] = [];
  const logoCandidates: string[] = [];
  const seenProd = new Set<string>();
  const seenLogo = new Set<string>();

  if (!content || !supplierWebsite) {
    return { productImages, logoCandidates };
  }

  // 1. Check explicit OG_IMAGE lines injected during crawl
  const ogMatches = content.matchAll(/^OG_IMAGE:\s*(https?:\/\/\S+)/gim);
  for (const m of ogMatches) {
    const abs = toAbsoluteUrl(m[1], supplierWebsite);
    if (!abs) continue;
    if (LOGO_URL_HINT_RE.test(abs)) {
      if (!seenLogo.has(abs)) {
        seenLogo.add(abs);
        logoCandidates.push(abs);
      }
    } else if (isValidProductImageUrl(abs) && !seenProd.has(abs)) {
      seenProd.add(abs);
      productImages.push({ url: abs, alt: "og_image", context: "" });
    }
  }

  // 2. Scan markdown image links: ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(content)) !== null) {
    const alt = (match[1] ?? "").trim();
    const rawUrl = (match[2] ?? "").trim();
    const abs = toAbsoluteUrl(rawUrl, supplierWebsite);
    if (!abs) continue;

    // Check if it looks like a company logo
    if (
      LOGO_URL_HINT_RE.test(abs) ||
      /\blogo\b/i.test(alt)
    ) {
      if (!seenLogo.has(abs)) {
        seenLogo.add(abs);
        logoCandidates.push(abs);
      }
      continue;
    }

    if (!isValidProductImageUrl(abs) || seenProd.has(abs)) continue;
    seenProd.add(abs);

    const start = Math.max(0, match.index - 160);
    const end = Math.min(content.length, match.index + match[0].length + 160);
    const context = content.slice(start, end).replace(/\s+/g, " ");
    productImages.push({ url: abs, alt, context });
  }

  return { productImages, logoCandidates };
}

/**
 * Matches an extracted product to the best candidate image from the crawled content
 * if the LLM didn't already populate a valid `image_url`.
 */
export function matchProductToCrawledImage(
  product: ExtractedProduct,
  candidates: MarkdownImageCandidate[],
  supplierWebsite: string | null
): string | null {
  if (product.image_url) {
    const abs = toAbsoluteUrl(product.image_url, supplierWebsite);
    if (abs && isValidProductImageUrl(abs)) {
      return abs;
    }
  }

  if (candidates.length === 0) return null;

  const words = (product.product_name ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  const catWords = (product.category ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  let bestUrl: string | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const hayUrlAndAlt = `${c.url} ${c.alt}`.toLowerCase();
    const hayContext = c.context.toLowerCase();
    let score = 0;

    for (const w of words) {
      if (hayUrlAndAlt.includes(w)) score += 4;
      else if (hayContext.includes(w)) score += 2;
    }
    for (const cw of catWords) {
      if (hayUrlAndAlt.includes(cw)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestUrl = c.url;
    }
  }

  return bestScore >= 2 ? bestUrl : null;
}

function sanitizeFilename(url: string): string {
  let name = "product";
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    if (last) name = last;
  } catch {}
  name = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 70);
  if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) name += ".jpg";
  return name;
}

/**
 * Downloads an external product image and re-hosts it to Supabase Storage (`product-images`)
 * so hotlink protection / expiring URLs never break the catalog UI.
 */
export async function rehostProductImageToStorage(
  supplierId: string,
  imageUrl: string,
  index = 0
): Promise<string> {
  if (imageUrl.includes(".supabase.co/storage/")) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return imageUrl;

    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("image/")) return imageUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 800) return imageUrl; // skip 1x1 tracking pixels

    const filename = `scraped-${index}-${sanitizeFilename(imageUrl)}`;
    const path = `${supplierId}/${filename}`;

    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_BUCKET)
      .upload(path, buffer, { contentType: ct, upsert: true });

    if (error) return imageUrl;

    const { data: pub } = supabaseAdmin.storage
      .from(PRODUCT_BUCKET)
      .getPublicUrl(path);
    return pub.publicUrl || imageUrl;
  } catch {
    return imageUrl;
  }
}

/**
 * Re-hosts a supplier logo to `supplier-logos` in Supabase Storage, or falls back to the URL.
 */
export async function rehostSupplierLogoToStorage(
  supplierId: string,
  logoUrl: string
): Promise<string> {
  if (logoUrl.includes(".supabase.co/storage/") || logoUrl.includes("gstatic.com/faviconV2")) {
    return logoUrl;
  }

  try {
    const res = await fetch(logoUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return logoUrl;

    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("image/")) return logoUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 200) return logoUrl;

    const ext = ct.includes("svg")
      ? "svg"
      : ct.includes("png")
        ? "png"
        : ct.includes("webp")
          ? "webp"
          : "jpg";
    const path = `${supplierId}/logo.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .upload(path, buffer, { contentType: ct, upsert: true });

    if (error) return logoUrl;

    const { data: pub } = supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(path);
    return pub.publicUrl || logoUrl;
  } catch {
    return logoUrl;
  }
}
