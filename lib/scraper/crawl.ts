import Firecrawl from "@mendable/firecrawl-js";
import type { Document } from "@mendable/firecrawl-js";
import { researchSupplier } from "./perplexity";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function crawlSupplier(
  website: string,
  companyName: string,
  country: string | null
): Promise<string> {
  const firecrawl = new Firecrawl({
    apiKey: process.env.FIRECRAWL_API_KEY,
  });

  try {
    const crawlJob = await firecrawl.crawl(website, {
      limit: 10,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
      includePaths: [
        "/products",
        "/our-products",
        "/catalogue",
        "/catalog",
        "/range",
        "/food",
        "/certifications",
        "/certificates",
        "/quality",
        "/about",
      ],
    });

    const pages = crawlJob.data as Document[];

    const combinedText = pages
      .map(
        (page) =>
          `URL: ${page.metadata?.sourceURL ?? page.metadata?.url ?? ""}\n\n${page.markdown ?? ""}`
      )
      .join("\n\n---PAGE BREAK---\n\n")
      .slice(0, 50000);

    // If little content returned, try language-specific URLs
    if (combinedText.length < 5000) {
      const baseUrl = website;
      const langVariants = [
        baseUrl,
        baseUrl + "?lang=it",
        baseUrl + "?lang=es",
        baseUrl + "?lang=fr",
        baseUrl + "?lang=de",
        baseUrl + "?lang=pl",
        baseUrl + "/it/",
        baseUrl + "/es/",
        baseUrl + "/fr/",
        baseUrl + "/de/",
      ];

      for (const variant of langVariants) {
        if (variant === baseUrl) continue;
        try {
          await sleep(3000);
          const page = await firecrawl.scrape(variant, {
            formats: ["markdown"],
            onlyMainContent: true,
          });
          const varContent = (page as Document).markdown ?? "";
          if (varContent.length > 3000) {
            console.log(`  ℹ Better content found at: ${variant}`);
            return varContent;
          }
        } catch {
          continue;
        }
      }
    }

    // Perplexity fallback when crawl returned minimal content
    if (combinedText.length < 500) {
      console.log(`  🔍 Crawl returned minimal content — trying Perplexity research...`);
      try {
        const result = await researchSupplier(companyName, website, country);
        if (result.content.length > 200) {
          console.log(`  ✓ Perplexity found ${result.content.length} chars`);
          return `[PERPLEXITY RESEARCH]\nSources: ${result.sources.join(", ")}\n\n${result.content}`;
        }
      } catch {
        // fall through to return combinedText
      }
    }

    return combinedText;
  } catch (err: unknown) {
    const status =
      ((err as Record<string, unknown>)?.status as number | undefined) ??
      ((err as Record<string, unknown>)?.statusCode as number | undefined);

    // 429 rate-limit: wait 20s then retry with single-page scrape
    if (status === 429) {
      console.log(`  ⏳ Rate limited — waiting 20s before retry...`);
      await sleep(20000);
      try {
        const page = await firecrawl.scrape(website, {
          formats: ["markdown"],
          onlyMainContent: true,
        });
        return (page as Document).markdown ?? "";
      } catch {
        return "";
      }
    }

    console.error(`Crawl error for ${website}:`, err);

    // First fallback: scrape the homepage directly
    try {
      const page = await firecrawl.scrape(website, {
        formats: ["markdown"],
        onlyMainContent: true,
      });
      const homepageContent = (page as Document).markdown ?? "";
      if (homepageContent.length > 200) return homepageContent;
    } catch {
      // continue to product-path fallback
    }

    // Second fallback: try common product-page paths
    const productPaths = [
      "/products",
      "/our-products",
      "/catalogue",
      "/catalog",
      "/range",
      "/food-products",
      "/what-we-make",
    ];

    for (const path of productPaths) {
      try {
        const url = new URL(path, website).href;
        const page = await firecrawl.scrape(url, {
          formats: ["markdown"],
          onlyMainContent: true,
        });
        const content = (page as Document).markdown ?? "";
        if (content.length > 200) return content;
      } catch {
        // try next path
      }
      await sleep(5000);
    }

    // Perplexity fallback — all Firecrawl paths exhausted
    console.log(`  🔍 Firecrawl failed — trying Perplexity research...`);
    try {
      const result = await researchSupplier(companyName, website, country);
      if (result.content.length > 200) {
        console.log(
          `  ✓ Perplexity found ${result.content.length} chars from ${result.sources.length} sources`
        );
        return `[PERPLEXITY RESEARCH]\nSources: ${result.sources.join(", ")}\n\n${result.content}`;
      }
    } catch (pErr) {
      console.log(`  ✗ Perplexity also failed: ${pErr}`);
    }

    return "";
  }
}
