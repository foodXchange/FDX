import Firecrawl from "@mendable/firecrawl-js";
import { MAP_LIMIT_DEFAULT, MAX_PRODUCT_PAGES, FIRECRAWL_SCRAPE_OPTIONS } from "./constants";
import { isProductUrl, isContactUrl } from "./urlFilters";
import { extractProducts, ExtractedProduct } from "./extract";
import { resolveProductImage } from "./resolveProductImage";

const PIPELINE_TIMEOUT_MS = 180_000;

function getFirecrawl() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not set");
  return new Firecrawl({ apiKey: key });
}

function normalizeProductName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  while (normalized.match(/\s*[\(\[][^(\)\]]*[\)\]]\s*$/)) {
    normalized = normalized.replace(/\s*[\(\[][^(\)\]]*[\)\]]\s*$/, "").trim();
  }

  normalized = normalized.replace(/\s*\d+\s*(?:u|units?|g|kg|ml|l)\b.*$/i, "").trim();
  normalized = normalized.replace(/\s*(?:tray|bag|box|tupper|bulk|pack)\b.*$/i, "").trim();

  const spanishToEnglish: Record<string, string> = {
    redondas: "round",
    cuadradas: "square",
    largas: "long",
    rellenas: "filled",
    tradicional: "traditional",
    marmol: "marble",
    albaricoque: "apricot",
    fresa: "strawberry",
    limon: "lemon",
    muffins: "muffins",
  };

  for (const [spanish, english] of Object.entries(spanishToEnglish)) {
    normalized = normalized.replace(new RegExp(`\\b${spanish}\\b`, "g"), english);
  }

  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

function scoreProduct(product: ExtractedProduct): number {
  const descriptionLength = product.description?.trim().length ?? 0;
  const formatsCount = product.formats?.length ?? 0;
  const sizesCount = product.sizes?.length ?? 0;
  const certificationsCount = product.certifications?.length ?? 0;
  const tagsCount = product.tags?.length ?? 0;
  const confidence = product.confidence ?? 0;

  return (
    confidence * 1000 +
    Math.min(descriptionLength, 200) * 2 +
    formatsCount * 15 +
    sizesCount * 10 +
    certificationsCount * 8 +
    tagsCount * 5
  );
}

export function deduplicateProducts(pageProducts: PageProduct[]): PageProduct[] {
  const groups = new Map<string, PageProduct[]>();

  for (const item of pageProducts) {
    const normalized = normalizeProductName(item.product.product_name);
    const bucket = groups.get(normalized) ?? [];
    bucket.push(item);
    groups.set(normalized, bucket);
  }

  const chosen: PageProduct[] = [];
  for (const [, bucket] of groups.entries()) {
    bucket.sort((a, b) => {
      const scoreA = scoreProduct(a.product);
      const scoreB = scoreProduct(b.product);
      if (scoreB !== scoreA) return scoreB - scoreA;
      const descA = a.product.description?.trim().length ?? 0;
      const descB = b.product.description?.trim().length ?? 0;
      if (descB !== descA) return descB - descA;
      const fmtA = a.product.formats?.length ?? 0;
      const fmtB = b.product.formats?.length ?? 0;
      return fmtB - fmtA;
    });

    const primary = bucket[0];
    if (bucket.length === 1) {
      chosen.push(primary);
      continue;
    }

    const mergedFormats = new Set(primary.product.formats ?? []);
    const mergedCertifications = new Set(primary.product.certifications ?? []);
    const mergedSizes = new Set(primary.product.sizes ?? []);
    let bestDescription = primary.product.description ?? "";

    for (let i = 1; i < bucket.length; i += 1) {
      const source = bucket[i].product;
      for (const format of source.formats ?? []) {
        mergedFormats.add(format);
      }
      for (const certification of source.certifications ?? []) {
        mergedCertifications.add(certification);
      }
      for (const size of source.sizes ?? []) {
        mergedSizes.add(size);
      }
      const sourceDesc = source.description?.trim() ?? "";
      if (sourceDesc.length > bestDescription.trim().length) {
        bestDescription = source.description ?? bestDescription;
      }
    }

    primary.product.formats = Array.from(mergedFormats);
    primary.product.certifications = Array.from(mergedCertifications);
    primary.product.sizes = Array.from(mergedSizes);
    primary.product.description = bestDescription || null;

    if (!primary.image_url) {
      const withImage = bucket.find((item) => item.image_url);
      if (withImage) {
        primary.image_url = withImage.image_url;
        primary.image_source = withImage.image_source;
      }
    }

    console.log(
      `Merged ${bucket.length} variants of ${primary.product.product_name} → 1 row with ${primary.product.formats.length} formats`
    );
    chosen.push(primary);
  }

  return chosen;
}

export interface ScrapeOpts {
  mapLimit?: number;
  maxPages?: number;
  dryRun?: boolean;
}

export interface PageProduct {
  source_url: string;
  page_type: string;
  supplier_id: string;
  product: ExtractedProduct;
  image_url: string | null;
  image_source: string | null;
}

export interface ContactPage {
  source_url: string;
  markdown: string;
}

export interface ScrapeResult {
  supplierId: string;
  supplierUrl: string;
  needsReview: boolean;
  pagesScraped: number;
  products: PageProduct[];
  homepageMarkdown: string;
  allMarkdown: string;
  contactPages: ContactPage[];
}

export async function scrapeSupplier(supplierId: string, supplierUrl: string, opts: ScrapeOpts = {}): Promise<ScrapeResult> {
  const firecrawl = getFirecrawl();
  const mapLimit = opts.mapLimit ?? MAP_LIMIT_DEFAULT;
  const maxPages = opts.maxPages ?? MAX_PRODUCT_PAGES;

  // Stage 1: Map
  let links: string[] = [];
  let mapFailed = false;
  try {
    const resp = await Promise.race([
      firecrawl.map(supplierUrl, { limit: mapLimit }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firecrawl map timeout")), PIPELINE_TIMEOUT_MS)
      ),
    ]);
    links = (resp?.links || []).map((l: any) => l.url).filter(Boolean);
  } catch (err) {
    mapFailed = true;
    console.warn("⚠ map failed/empty — falling back to homepage only", err);
    links = [];
  }

  if (mapFailed || links.length === 0) {
    console.warn("⚠ map failed/empty — falling back to homepage only");
    links = [supplierUrl];
  }

  // Stage 2: Filter
  const homepageOnly = [supplierUrl];
  const productUrls = links.filter((u) => isProductUrl(new URL(u, supplierUrl).pathname));
  const uniqueUrls = Array.from(new Set(productUrls));
  const selected = uniqueUrls.slice(0, maxPages);

  const contactUrls = links
    .filter((u) => isContactUrl(new URL(u, supplierUrl).pathname))
    .map((u) => new URL(u, supplierUrl).href);
  const uniqueContactUrls = Array.from(new Set(contactUrls));
  const contactTargets = uniqueContactUrls.slice(0, 5);

  const pagesToScrape = selected.length > 0 ? selected : homepageOnly;
  const needsReview = selected.length === 0;

  // Stage 3: Batch scrape
  let pages: Array<{ url: string; markdown: string; metadata?: { ogImage?: string | null } | null }> = [];
  try {
    // Firecrawl types are permissive here — cast to any to avoid strict SDK type mismatches
    const job: any = await firecrawl.batchScrape(pagesToScrape, FIRECRAWL_SCRAPE_OPTIONS as any);
    const results: any[] = job?.data || [];
    for (const p of results) {
      pages.push({ url: p.url, markdown: p.markdown || p.content || "", metadata: p.metadata });
    }
  } catch (err) {
    console.warn("Firecrawl batchScrape errors — attempting best-effort per-URL:", err);
    for (const u of pagesToScrape) {
      try {
        const job: any = await firecrawl.scrape(u, FIRECRAWL_SCRAPE_OPTIONS as any);
        pages.push({ url: u, markdown: job?.markdown || job?.content || "", metadata: job?.metadata });
      } catch (e) {
        console.warn("Failed to scrape", u, e);
      }
    }
  }

  let contactPages: ContactPage[] = [];
  const contactPageTargets = contactTargets.length > 0 ? contactTargets : [supplierUrl];
  if (contactTargets.length === 0 && pagesToScrape.length === 1 && pagesToScrape[0] === supplierUrl) {
    contactPages = pages.map((p) => ({ source_url: p.url, markdown: p.markdown }));
  } else {
    try {
      const job: any = await firecrawl.batchScrape(contactPageTargets, FIRECRAWL_SCRAPE_OPTIONS as any);
      const results: any[] = job?.data || [];
      for (const p of results) {
        contactPages.push({ source_url: p.url, markdown: p.markdown || p.content || "" });
      }
    } catch (err) {
      console.warn("Firecrawl batchScrape for contact pages failed — attempting best-effort per-URL:", err);
      for (const u of contactPageTargets) {
        try {
          const job: any = await firecrawl.scrape(u, FIRECRAWL_SCRAPE_OPTIONS as any);
          contactPages.push({ source_url: u, markdown: job?.markdown || job?.content || "" });
        } catch (e) {
          console.warn("Failed to scrape contact page", u, e);
        }
      }
    }
  }

  // Stage 4: Extract + return
  const extractedAll: PageProduct[] = [];
  for (const p of pages) {
    try {
      const prods = await extractProducts(p.markdown, { company_name: supplierId, country_of_origin: null, certifications: [] });
      const { url: image_url, source: image_source } = resolveProductImage(
        { metadata: p.metadata, markdown: p.markdown },
        p.url
      );
      for (const pr of prods) {
        extractedAll.push({
          source_url: p.url,
          page_type: "product",
          supplier_id: supplierId,
          product: pr,
          image_url,
          image_source,
        });
      }
    } catch (err) {
      console.warn("Extraction failed for page", p.url, err);
    }
  }

  const deduplicated = deduplicateProducts(extractedAll);
  const duplicateCount = extractedAll.length - deduplicated.length;
  if (duplicateCount > 0) {
    console.log(`  Deduplicated ${duplicateCount} duplicate product(s) by normalized name`);
  }

  return {
    supplierId,
    supplierUrl,
    needsReview,
    pagesScraped: pages.length + contactPages.length,
    products: deduplicated,
    homepageMarkdown: pages[0]?.markdown ?? "",
    allMarkdown: pages.map((p) => p.markdown).join("\n\n---PAGE BREAK---\n\n"),
    contactPages,
  };
}

export default { scrapeSupplier };
