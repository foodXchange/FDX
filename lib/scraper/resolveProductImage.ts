export type ImageSource = "og:image" | "twitter:image" | "product_img";

export interface ResolvedImage {
  url: string | null;
  source: ImageSource | null;
}

const NO_IMAGE: ResolvedImage = { url: null, source: null };

function toAbsoluteUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url.trim(), baseUrl).href;
  } catch {
    return null;
  }
}

function isLikelyIcon(url: string): boolean {
  if (url.startsWith("data:")) return true;
  if (/\.svg(\?|#|$)/i.test(url)) return true;
  return /\b(logo|icon|favicon|sprite|spacer|pixel|placeholder|avatar|badge)\b/i.test(url);
}

function metaTagContent(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*\\scontent=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*\\s(?:property|name)=["']${escaped}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Full og:image → twitter:image → first sizable <img> fallback chain.
 * Used by the backfill script, which fetches raw page HTML directly.
 */
export function resolveImageFromHtml(html: string, baseUrl: string): ResolvedImage {
  const ogImage = metaTagContent(html, "og:image") ?? metaTagContent(html, "og:image:secure_url");
  if (ogImage) {
    const abs = toAbsoluteUrl(ogImage, baseUrl);
    if (abs && !isLikelyIcon(abs)) return { url: abs, source: "og:image" };
  }

  const twitterImage =
    metaTagContent(html, "twitter:image") ?? metaTagContent(html, "twitter:image:src");
  if (twitterImage) {
    const abs = toAbsoluteUrl(twitterImage, baseUrl);
    if (abs && !isLikelyIcon(abs)) return { url: abs, source: "twitter:image" };
  }

  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const m of imgMatches) {
    const src = m[1];
    if (!src || isLikelyIcon(src)) continue;
    const abs = toAbsoluteUrl(src, baseUrl);
    if (!abs || isLikelyIcon(abs)) continue;
    return { url: abs, source: "product_img" };
  }

  return NO_IMAGE;
}

/**
 * First real (non-icon) image referenced in markdown image syntax ![alt](url).
 * Approximates "first <img> on page" when only markdown content is available.
 */
function resolveImageFromMarkdown(markdown: string, baseUrl: string): ResolvedImage {
  const matches = markdown.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)/g);
  for (const m of matches) {
    const src = m[1];
    if (!src || isLikelyIcon(src)) continue;
    const abs = toAbsoluteUrl(src, baseUrl);
    if (!abs || isLikelyIcon(abs)) continue;
    return { url: abs, source: "product_img" };
  }
  return NO_IMAGE;
}

/**
 * Resolution used during live scraping, where Firecrawl returns page metadata
 * (including a pre-parsed og:image) plus markdown — but not raw HTML.
 * Falls back to scanning markdown image syntax for the first real image.
 */
export function resolveProductImage(
  page: { metadata?: { ogImage?: string | null } | null; markdown?: string | null },
  baseUrl: string
): ResolvedImage {
  const ogImage = page.metadata?.ogImage;
  if (ogImage) {
    const abs = toAbsoluteUrl(ogImage, baseUrl);
    if (abs && !isLikelyIcon(abs)) return { url: abs, source: "og:image" };
  }

  if (page.markdown) {
    const fromMarkdown = resolveImageFromMarkdown(page.markdown, baseUrl);
    if (fromMarkdown.url) return fromMarkdown;
  }

  return NO_IMAGE;
}
