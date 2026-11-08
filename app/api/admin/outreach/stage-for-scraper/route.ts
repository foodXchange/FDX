import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generateGeminiWithFallback } from "@/lib/ai/models";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PendingScrapeSupplier {
  id: string;
  companyName: string;
  website: string;
  contactEmail: string;
  country: string;
  productFocus: string;
  certifications: string[];
  sourceEmailSnippet?: string;
  status: "pending_scrape" | "scraped";
  discoveredAt: string;
}

const PENDING_SCRAPE_FILE = path.join(
  process.cwd(),
  "data",
  "pending-scrape-suppliers.json"
);

declare global {
  // eslint-disable-next-line no-var
  var __fdxPendingScrapeSuppliers: PendingScrapeSupplier[] | undefined;
}

const DEFAULT_PENDING_SUPPLIERS: PendingScrapeSupplier[] = [
  {
    id: "ps_seed_1",
    companyName: "Torras Chocolates (Chocolates Torras S.A.)",
    website: "https://www.chocolatestorras.com",
    contactEmail: "export@chocolatestorras.com",
    country: "Spain",
    productFocus: "Stevia & Erythritol Sugar-Free Organic Chocolate Bars",
    certifications: ["Sugar Free", "Gluten Free", "IFS Food"],
    sourceEmailSnippet:
      "Discovered via inbound trade show follow-up (ISM Cologne) — full stevia & keto tablet catalog available on website.",
    status: "pending_scrape",
    discoveredAt: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: "ps_seed_2",
    companyName: "Cavalier Chocolates N.V.",
    website: "https://www.cavalier.be",
    contactEmail: "info@cavalier.be",
    country: "Belgium",
    productFocus: "Belgian No-Added-Sugar Stevia Pralines & Chocolate Bark",
    certifications: ["Sugar Free", "Keto Friendly", "BRC"],
    sourceEmailSnippet:
      "Extracted from European Confectionery Export Directory email — manufactures stevia-sweetened dark & milk lines.",
    status: "pending_scrape",
    discoveredAt: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
];

function readPendingScrapeList(): PendingScrapeSupplier[] {
  if (globalThis.__fdxPendingScrapeSuppliers) {
    return globalThis.__fdxPendingScrapeSuppliers;
  }
  try {
    if (fs.existsSync(PENDING_SCRAPE_FILE)) {
      const raw = fs.readFileSync(PENDING_SCRAPE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        globalThis.__fdxPendingScrapeSuppliers = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore fs read errors
  }
  globalThis.__fdxPendingScrapeSuppliers = [...DEFAULT_PENDING_SUPPLIERS];
  return globalThis.__fdxPendingScrapeSuppliers;
}

function writePendingScrapeList(list: PendingScrapeSupplier[]): void {
  globalThis.__fdxPendingScrapeSuppliers = [...list];
  try {
    const dir = path.dirname(PENDING_SCRAPE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PENDING_SCRAPE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
    // ignore fs write errors on read-only serverless environment
  }
}

function inferWebsiteFromEmail(email: string): string {
  const clean = (email || "").trim().toLowerCase();
  const atIdx = clean.indexOf("@");
  if (atIdx < 0) return "";
  const domain = clean.slice(atIdx + 1);
  const freeDomains = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "aol.com",
    "walla.co.il",
  ]);
  if (!domain || freeDomains.has(domain)) return "";
  return `https://www.${domain}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const checkDomain = searchParams.get("check_domain")?.toLowerCase() || "";
  const checkWebsite = searchParams.get("check_website")?.toLowerCase() || "";

  const list = readPendingScrapeList();

  // Try to query Supabase supplier_offerings
  let dbScrapedOfferings: Array<{
    company_name: string;
    website: string | null;
    product_count: number | null;
    scrape_status: string | null;
  }> = [];

  try {
    const { data } = await supabaseAdmin
      .from("supplier_offerings")
      .select("company_name, website, product_count, scrape_status")
      .limit(400);
    if (data && Array.isArray(data)) {
      dbScrapedOfferings = data;
    }
  } catch {
    // Graceful fallback if Supabase free quota restricts DB calls
  }

  // Build a set of known scraped domains
  const scrapedDomains = new Set<string>();
  for (const o of dbScrapedOfferings) {
    if (o.scrape_status === "scraped" || (o.product_count && o.product_count > 0)) {
      if (o.website) {
        try {
          const raw = o.website.startsWith("http") ? o.website : `https://${o.website}`;
          const d = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
          if (d) scrapedDomains.add(d);
        } catch {}
      }
    }
  }

  // Also seed high-frequency demo/core factories as verified scraped
  scrapedDomains.add("valor.es");
  scrapedDomains.add("lasuissa.it");
  scrapedDomains.add("frankonia-schokolade.de");

  const pendingDomains = new Set<string>();
  for (const p of list) {
    if (p.website) {
      try {
        const raw = p.website.startsWith("http") ? p.website : `https://${p.website}`;
        const d = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
        if (d) pendingDomains.add(d);
      } catch {}
    }
  }

  const checkTarget = (checkDomain || checkWebsite)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase();

  const isAlreadyScraped = checkTarget ? scrapedDomains.has(checkTarget) : false;
  const isPending = checkTarget ? pendingDomains.has(checkTarget) : false;

  return NextResponse.json({
    ok: true,
    pendingSuppliers: list,
    scrapedDomains: Array.from(scrapedDomains),
    pendingDomains: Array.from(pendingDomains),
    checked: checkTarget
      ? {
          target: checkTarget,
          isAlreadyScraped,
          isPending,
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "stage";

    if (action === "remove") {
      const id = typeof body.id === "string" ? body.id : "";
      const list = readPendingScrapeList().filter((item) => item.id !== id);
      writePendingScrapeList(list);
      return NextResponse.json({
        ok: true,
        pendingSuppliers: list,
        message: "Removed from pending scraper queue.",
      });
    }

    // Action: "extract_from_email" — Uses Gemini AI (with deterministic regex fallback)
    // to discover 1 or more new suppliers from any pasted/received email text
    if (action === "extract_from_email") {
      const rawEmailText =
        typeof body.rawEmailText === "string" ? body.rawEmailText.trim() : "";
      const fromEmail =
        typeof body.fromEmail === "string" ? body.fromEmail.trim() : "";

      if (!rawEmailText && !fromEmail) {
        return NextResponse.json(
          {
            ok: false,
            error: "Paste an email body, signature, or sender address to extract suppliers.",
          },
          { status: 400 }
        );
      }

      let extracted: Array<{
        companyName: string;
        website: string;
        contactEmail: string;
        country: string;
        productFocus: string;
        certifications: string[];
      }> = [];

      try {
        const prompt = `You are a B2B Food & Beverage Supplier Discovery Agent for FoodXchange (FDX).
Analyze the following incoming email / newsletter / broker introduction / email signature and extract all food & beverage manufacturers or suppliers mentioned.
For each supplier:
- Infer the website URL from links in the text OR from the corporate email domain (e.g. export@torras.es -> https://www.torras.es).
- Identify company name, country, contact email, main product focus, and any certifications mentioned.

Sender Email: ${fromEmail}
Email Text:
${rawEmailText.slice(0, 4000)}

Return ONLY valid JSON with this exact structure:
{
  "suppliers": [
    {
      "companyName": "Factory or Brand Name",
      "website": "https://www.domain.com",
      "contactEmail": "export@domain.com",
      "country": "Country Name",
      "productFocus": "Short description of products manufactured",
      "certifications": ["Kosher", "BRC", "IFS", "Sugar Free", "Organic"]
    }
  ]
}`;

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });
        const aiRes = await generateGeminiWithFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });
        const parsed = JSON.parse(aiRes.text ?? "{}");
        if (Array.isArray(parsed.suppliers) && parsed.suppliers.length > 0) {
          extracted = parsed.suppliers;
        }
      } catch {
        // Fallback to deterministic regex extraction if AI is unavailable
      }

      if (extracted.length === 0) {
        const emailMatch =
          fromEmail ||
          rawEmailText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ||
          "";
        const urlMatch =
          rawEmailText.match(/https?:\/\/[^\s)>"]+/i)?.[0] ||
          rawEmailText.match(/www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)?.[0] ||
          inferWebsiteFromEmail(emailMatch);

        const cleanWebsite = urlMatch
          ? urlMatch.startsWith("http")
            ? urlMatch
            : `https://${urlMatch}`
          : "";
        const domainLabel = cleanWebsite
          .replace(/^https?:\/\/(www\.)?/i, "")
          .split("/")[0]
          .split(".")[0];
        const guessedCompany = domainLabel
          ? `${domainLabel.charAt(0).toUpperCase()}${domainLabel.slice(1)} Foods`
          : "Discovered Email Supplier";

        extracted = [
          {
            companyName: guessedCompany,
            website: cleanWebsite,
            contactEmail: emailMatch,
            country: "International",
            productFocus: rawEmailText.slice(0, 140) || "Food & Beverage Manufacturer",
            certifications: [],
          },
        ];
      }

      const list = readPendingScrapeList();
      const added: PendingScrapeSupplier[] = [];

      for (const s of extracted) {
        const website =
          s.website?.trim() || inferWebsiteFromEmail(s.contactEmail || fromEmail);
        const companyName = s.companyName?.trim() || "Discovered Supplier";
        const contactEmail = (s.contactEmail || fromEmail || "").trim();

        const existingIdx = list.findIndex(
          (item) =>
            (website && item.website.toLowerCase() === website.toLowerCase()) ||
            item.companyName.toLowerCase() === companyName.toLowerCase()
        );

        const entry: PendingScrapeSupplier = {
          id:
            existingIdx >= 0
              ? list[existingIdx].id
              : `ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          companyName,
          website: website || "https://",
          contactEmail,
          country: s.country || "Europe",
          productFocus: s.productFocus || "Food & Beverage Catalog",
          certifications: Array.isArray(s.certifications) ? s.certifications : [],
          sourceEmailSnippet: rawEmailText.slice(0, 220),
          status: "pending_scrape",
          discoveredAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          list[existingIdx] = entry;
        } else {
          list.unshift(entry);
        }
        added.push(entry);

        // Also stage into Supabase supplier_offerings if DB is writable
        try {
          await supabaseAdmin.from("supplier_offerings").insert({
            company_name: entry.companyName,
            product_name: `[PENDING SCRAPE] ${entry.productFocus}`,
            country: entry.country,
            website: entry.website,
            contact_email: entry.contactEmail || null,
            certifications: entry.certifications,
          });
        } catch {
          // ignore if Supabase is temporarily restricted by quota
        }
      }

      writePendingScrapeList(list);

      return NextResponse.json({
        ok: true,
        addedCount: added.length,
        added,
        pendingSuppliers: list,
        message: `🕷️ Discovered & staged ${added.length} supplier(s) (${added
          .map((a) => a.companyName)
          .join(", ")}) into the Pending Web Scraper Queue!`,
      });
    }

    // Default Action: Stage a single supplier directly (e.g. 1-click from active thread or form)
    const companyName =
      typeof body.companyName === "string" && body.companyName.trim()
        ? body.companyName.trim()
        : "Discovered Supplier";
    const contactEmail =
      typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const website =
      (typeof body.website === "string" && body.website.trim()) ||
      inferWebsiteFromEmail(contactEmail);
    const country =
      typeof body.country === "string" && body.country.trim()
        ? body.country.trim()
        : "International";
    const productFocus =
      typeof body.productFocus === "string" && body.productFocus.trim()
        ? body.productFocus.trim()
        : "Full Export Product Catalog";

    const list = readPendingScrapeList();
    const existingIdx = list.findIndex(
      (item) =>
        (website && item.website.toLowerCase() === website.toLowerCase()) ||
        item.companyName.toLowerCase() === companyName.toLowerCase()
    );

    const entry: PendingScrapeSupplier = {
      id:
        existingIdx >= 0
          ? list[existingIdx].id
          : `ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      companyName,
      website: website || "https://",
      contactEmail,
      country,
      productFocus,
      certifications: Array.isArray(body.certifications) ? body.certifications : [],
      sourceEmailSnippet:
        typeof body.sourceEmailSnippet === "string"
          ? body.sourceEmailSnippet.slice(0, 220)
          : "Staged from Email & Outreach Hub for deep Firecrawl catalog scraping.",
      status: "pending_scrape",
      discoveredAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = entry;
    } else {
      list.unshift(entry);
    }

    writePendingScrapeList(list);

    try {
      await supabaseAdmin.from("supplier_offerings").insert({
        company_name: entry.companyName,
        product_name: `[PENDING SCRAPE] ${entry.productFocus}`,
        country: entry.country,
        website: entry.website,
        contact_email: entry.contactEmail || null,
        certifications: entry.certifications,
      });
    } catch {
      // ignore if Supabase is restricted by quota
    }

    return NextResponse.json({
      ok: true,
      entry,
      pendingSuppliers: list,
      message: `🕷️ Staged "${companyName}" (${
        website || contactEmail
      }) in the Pending Web Scraper Queue!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to stage supplier for scraper" },
      { status: 500 }
    );
  }
}
