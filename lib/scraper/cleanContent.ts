/**
 * Clean and condense raw scraped markdown/HTML to maximize information density
 * while removing boilerplate (cookies, navigation menus, social links, SVGs, base64 images).
 */
export function cleanScrapedContent(rawContent: string, maxChars: number = 40000): string {
  if (!rawContent) return "";

  let cleaned = rawContent
    // Remove base64 data URLs in images
    .replace(/!\[[^\]]*\]\(data:image\/[^;]+;base64,[^)]+\)/gi, "")
    // Remove inline SVG blocks
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    // Remove script and style tags
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "")
    // Remove cookie banners / privacy boilerplate lines
    .replace(/^.*(cookie|gdpr|privacy policy|terms of use|all rights reserved|informativa privacy).*$/gim, "")
    // Remove social link spam
    .replace(/\[(facebook|instagram|twitter|youtube|linkedin|tiktok)\]\([^)]+\)/gi, "")
    // Normalize excessive multiple newlines / whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  // If still longer than maxChars, prioritize keeping the beginning and product sections
  return cleaned.slice(0, maxChars);
}
