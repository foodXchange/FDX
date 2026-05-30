/**
 * Strip buyer/company name appended to product_name before public display.
 * Pattern: "Product Description, CompanyName" → "Product Description"
 */
export function stripBuyerFromProductName(
  productName: string,
  company: string | null | undefined
): string {
  if (!company) return productName;
  const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return productName.replace(new RegExp(`,\\s*${escaped}\\s*$`, "i"), "").trim();
}

export function publicBuyerLabel(): string {
  return "Israeli retail buyer";
}
