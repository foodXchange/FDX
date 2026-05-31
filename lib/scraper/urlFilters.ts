export const INCLUDE_PATTERNS = [
  /\/product/i,
  /\/products/i,
  /\/catalog/i,
  /\/catalogue/i,
  /\/range/i,
  /\/portfolio/i,
  /\/our-products/i,
  /\/our-range/i,
  /\/food/i,
  /\/items/i,
  /\/shop/i,
  /\/assortment/i,
];

export const EXCLUDE_PATTERNS = [
  /\/blog/i,
  /\/news/i,
  /\/press/i,
  /\/careers/i,
  /\/jobs/i,
  /\/about/i,
  /\/contact/i,
  /\/legal/i,
  /\/privacy/i,
  /\/terms/i,
  /\/cookie/i,
  /\/distributor/i,
  /\/investor/i,
  /\/event/i,
];

export const CONTACT_PATTERNS = [
  /\/contact/i,
  /\/about/i,
  /\/team/i,
  /\/company/i,
  /\/impressum/i,
  /\/kontakt/i,
  /\/contacto/i,
  /\/chi-siamo/i,
  /\/nosotros/i,
];

export function isProductUrl(path: string): boolean {
  const p = path.split(/[?#]/)[0];
  if (!p || p.length === 0) return false;
  const included = INCLUDE_PATTERNS.some((rx) => rx.test(p));
  const excluded = EXCLUDE_PATTERNS.some((rx) => rx.test(p));
  return included && !excluded;
}

export function isContactUrl(path: string): boolean {
  const p = path.split(/[?#]/)[0];
  if (!p || p.length === 0) return false;
  return CONTACT_PATTERNS.some((rx) => rx.test(p));
}

export default { INCLUDE_PATTERNS, EXCLUDE_PATTERNS, isProductUrl };
