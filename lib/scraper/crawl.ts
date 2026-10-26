import Firecrawl from "@mendable/firecrawl-js";
import type { Document } from "@mendable/firecrawl-js";
import { researchSupplier } from "./perplexity";

const USE_RESEARCH_ONLY =
  process.env.SCRAPER_MODE === "perplexity_only" ||
  process.env.SCRAPER_MODE === "research_only";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function crawlSupplier(
  website: string,
  companyName: string,
  country: string | null
): Promise<string> {
  if (USE_RESEARCH_ONLY) {
    console.log(`  🔍 Research-only mode — querying live Google Search...`);
    try {
      const result = await researchSupplier(companyName, website, country);
      if (result.content.length > 200) {
        console.log(`  ✓ Search research found ${result.content.length} chars`);
        return `[PERPLEXITY RESEARCH]\nSources: ${result.sources.join(", ")}\n\n${result.content}`;
      }
    } catch (pErr) {
      console.log(`  ✗ Search research failed: ${pErr}`);
    }
    return "";
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    // If no Firecrawl key, go directly to Gemini Google Search
    const result = await researchSupplier(companyName, website, country);
    return `[PERPLEXITY RESEARCH]\nSources: ${result.sources.join(", ")}\n\n${result.content}`;
  }

  const firecrawl = new Firecrawl({
    apiKey: firecrawlKey,
  });

  try {
    // 1. Fast crawl with tight limit
    const crawlJob = await Promise.race([
      firecrawl.crawl(website, {
        limit: 8,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: false,
        },
        includePaths: [
          "/products",
          "/our-products",
          "/product",
          "/catalogue",
          "/catalog",
          "/range",
          "/assortment",
          "/assortiment",
          "/prodotti",
          "/productos",
          "/produits",
          "/produkte",
          "/oferta",
          "/produkty",
          "/food",
          "/b2b",
          "/private-label",
          "/export",
          "/certifications",
          "/quality",
          "/qualita",
          "/calidad",
          "/about",
          "/chi-siamo",
          "/contact",
          "/contatti",
          "/contacto",
          "/kontakt",
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Crawl timeout after 25s")), 25000)
      ),
    ]);

    const pages = (crawlJob?.data as Document[]) || [];
    const combinedText = pages
      .map((page) => {
        const pageUrl = page.metadata?.sourceURL ?? page.metadata?.url ?? "";
        const ogImg = page.metadata?.ogImage ? `\nOG_IMAGE: ${page.metadata.ogImage}` : "";
        return `URL: ${pageUrl}${ogImg}\n\n${page.markdown ?? ""}`;
      })
      .join("\n\n---PAGE BREAK---\n\n")
      .slice(0, 50000);

    // If crawl returned meaningful content (>500 chars), we are done!
    if (combinedText.length >= 500) {
      return combinedText;
    }

    // 2. If crawl was thin, fall back to Google Grounded Search
    console.log(`  🔍 Crawl returned minimal content (${combinedText.length} chars) — triggering Google Grounded Research...`);
    const result = await researchSupplier(companyName, website, country);
    if (result.content.length > 200) {
      console.log(`  ✓ Search found ${result.content.length} chars`);
      return `[PERPLEXITY RESEARCH]\nSources: ${result.sources.join(", ")}\n\n${result.content}`;
    }

    return combinedText;
  } catch (err: unknown) {
    console.warn(`Firecrawl crawl failed or timed out for ${website}:`, err instanceof Error ? err.message : err);

    // 3. Fallback: Fast direct scrape of the homepage (10s timeout)
    try {
      const page = await Promise.race([
        firecrawl.scrape(website, {
          formats: ["markdown"],
          onlyMainContent: false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Scrape timeout")), 10000)
        ),
      ]);
      const doc = page as Document;
      const ogImg = doc?.metadata?.ogImage ? `OG_IMAGE: ${doc.metadata.ogImage}\n` : "";
      const homepageContent = `${ogImg}${doc?.markdown ?? ""}`;
      if (homepageContent.length > 400) {
        return homepageContent;
      }
    } catch {
      // Scrape failed, fall through to research
    }

    // 4. Ultimate reliable fallback: Gemini Live Google Search Research
    console.log(`  🔍 Firecrawl failed — executing Gemini Google Grounded Research for ${companyName}...`);
    try {
      const result = await researchSupplier(companyName, website, country);
      if (result.content.length > 200) {
        console.log(
          `  ✓ Search found ${result.content.length} chars from ${result.sources.length} sources`
        );
        return `[PERPLEXITY RESEARCH]\nSources: ${result.sources.join(", ")}\n\n${result.content}`;
      }
    } catch (pErr) {
      console.error(`  ✗ Google Grounded research also failed:`, pErr);
    }

    return "";
  }
}
