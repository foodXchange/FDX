export interface SupplierMatchRequest {
  id: string;
  product_name: string | null;
  category: string | null;
  message: string | null;
  certifications: string[] | null;
  created_at: string;
  company: string | null;
  volume: string | null;
  urgency: string | null;
}

export interface MatchBreakdown {
  certifications?: string[];
  kosher_types?: string[];
}

export interface SupplierMatch {
  id: string;
  match_score: number | null;
  status: string | null;
  supplier_response: "accepted" | "countered" | "declined" | null;
  supplier_message: string | null;
  supplier_responded_at: string | null;
  sent_at: string | null;
  closed_at: string | null;
  created_at: string;
  // Supplier-view: the buyer's request this match is for.
  sourcing_requests?: SupplierMatchRequest | null;
  // Buyer-view: the supplier this match is with.
  company_name?: string | null;
  country?: string | null;
  product_name?: string | null;
  match_breakdown?: MatchBreakdown | null;
}
