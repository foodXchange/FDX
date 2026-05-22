export interface FactoryData {
  id: string;
  kosher_types: string[];
  kosher_certifying_body: string | null;
  kosher_passover: boolean;
  certifications_quality: string[];
  certifications_dietary: string[];
  brc_grade: string | null;
  ifs_grade: string | null;
}

export interface ProductWithFactory {
  id: string;
  kosher_types: string[];
  certifications: string[];
  factory_id: string | null;
  product_override_kosher: boolean;
  factory?: FactoryData | null;
}

export function getEffectiveKosherTypes(product: {
  kosher_types: string[] | null;
  product_override_kosher?: boolean | null;
  factory?: { kosher_types: string[] } | null;
}): string[] {
  if (product.product_override_kosher) {
    return product.kosher_types ?? [];
  }
  if (product.factory?.kosher_types?.length) {
    return product.factory.kosher_types;
  }
  return product.kosher_types ?? [];
}

export function getEffectiveCertifications(product: {
  certifications: string[] | null;
  product_override_kosher?: boolean | null;
  factory?: {
    certifications_quality: string[];
    certifications_dietary: string[];
  } | null;
}): string[] {
  if (product.product_override_kosher) {
    return product.certifications ?? [];
  }
  const productCerts = product.certifications ?? [];
  if (!product.factory) return productCerts;
  const factoryCerts = [
    ...(product.factory.certifications_quality ?? []),
    ...(product.factory.certifications_dietary ?? []),
  ];
  if (factoryCerts.length === 0) return productCerts;
  return [...new Set([...factoryCerts, ...productCerts])];
}

export function isKosherCertified(product: Parameters<typeof getEffectiveKosherTypes>[0]): boolean {
  return getEffectiveKosherTypes(product).length > 0;
}

export function formatKosherDisplay(kosherTypes: string[]): string {
  if (!kosherTypes.length) return "";
  if (kosherTypes.includes("Chief Rabbinate")) return "Chief Rabbinate";
  if (kosherTypes.includes("Badatz")) return "Badatz";
  return kosherTypes[0];
}
