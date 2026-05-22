import Firecrawl from "@mendable/firecrawl-js";
import type { Document } from "@mendable/firecrawl-js";

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export async function crawlSupplier(website: string): Promise<string> {
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

    return combinedText;
  } catch (err) {
    console.error(`Crawl error for ${website}:`, err);
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
}
