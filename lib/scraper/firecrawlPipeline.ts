import Firecrawl from "@mendable/firecrawl-js";
import { MAP_LIMIT_DEFAULT, MAX_PRODUCT_PAGES, FIRECRAWL_SCRAPE_OPTIONS } from "./constants";
import { isProductUrl } from "./urlFilters";
import { extractProducts, ExtractedProduct } from "./extract";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

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
}

export interface ScrapeResult {
  supplierId: string;
  supplierUrl: string;
  needsReview: boolean;
  pagesScraped: number;
  products: PageProduct[];
  homepageMarkdown: string;
  allMarkdown: string;
}

export async function scrapeSupplier(supplierId: string, supplierUrl: string, opts: ScrapeOpts = {}): Promise<ScrapeResult> {
  const mapLimit = opts.mapLimit ?? MAP_LIMIT_DEFAULT;
  const maxPages = opts.maxPages ?? MAX_PRODUCT_PAGES;

  // Stage 1: Map
  let links: string[] = [];
  try {
    const resp = await firecrawl.map(supplierUrl, { limit: mapLimit });
    links = (resp?.links || []).map((l: any) => l.url).filter(Boolean);
  } catch (err) {
    console.warn("Firecrawl map failed, falling back to homepage only:", err);
    links = [];
  }

  // Stage 2: Filter
  const homepageOnly = [supplierUrl];
  const productUrls = links.filter((u) => isProductUrl(new URL(u, supplierUrl).pathname));
  const uniqueUrls = Array.from(new Set(productUrls));
  const selected = uniqueUrls.slice(0, maxPages);

  const pagesToScrape = selected.length > 0 ? selected : homepageOnly;
  const needsReview = selected.length === 0;

  // Stage 3: Batch scrape
  let pages: Array<{ url: string; markdown: string }> = [];
  try {
    // Firecrawl types are permissive here — cast to any to avoid strict SDK type mismatches
    const job: any = await firecrawl.batchScrape(pagesToScrape, FIRECRAWL_SCRAPE_OPTIONS as any);
    const results: any[] = job?.data || [];
    for (const p of results) {
      pages.push({ url: p.url, markdown: p.markdown || p.content || "" });
    }
  } catch (err) {
    console.warn("Firecrawl batchScrape errors — attempting best-effort per-URL:", err);
    for (const u of pagesToScrape) {
      try {
        const job: any = await firecrawl.scrape(u, FIRECRAWL_SCRAPE_OPTIONS as any);
        pages.push({ url: u, markdown: job?.markdown || job?.content || "" });
      } catch (e) {
        console.warn("Failed to scrape", u, e);
      }
    }
  }

  // Stage 4: Extract + return
  const extractedAll: PageProduct[] = [];
  for (const p of pages) {
    try {
      const prods = await extractProducts(p.markdown, { company_name: supplierId, country_of_origin: null, certifications: [] });
      for (const pr of prods) {
        extractedAll.push({ source_url: p.url, page_type: "product", supplier_id: supplierId, product: pr });
      }
    } catch (err) {
      console.warn("Extraction failed for page", p.url, err);
    }
  }

  return {
    supplierId,
    supplierUrl,
    needsReview,
    pagesScraped: pages.length,
    products: extractedAll,
    homepageMarkdown: pages[0]?.markdown ?? "",
    allMarkdown: pages.map(p => p.markdown).join("\n\n---PAGE BREAK---\n\n"),
  };
}

export default { scrapeSupplier };
