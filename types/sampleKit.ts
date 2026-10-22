export interface SampleKitItem {
  id: string;
  product_name: string;
  category: string;
  image_url?: string | null;
  supplier_name?: string | null;
  country_of_origin?: string | null;
  kosher_types?: string[];
  certifications?: string[];
  sample_format?: string;
}

export interface SampleOrderPayload {
  session_id: string;
  company: string;
  name: string;
  role_title?: string;
  whatsapp: string;
  email?: string;
  delivery_address: string;
  target_tasting_date?: string;
  special_notes?: string;
  items: SampleKitItem[];
}
