import { supabaseAdmin } from "@/lib/supabaseAdmin";
import MatchDashboardClient from "@/components/admin/MatchDashboardClient";
import type { EmailTemplateRow } from "@/components/admin/EmailTemplatesClient";

export const dynamic = "force-dynamic";

export type MatchRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  match_score: number;
  product_name: string | null;
  company_name: string | null;
  country: string | null;
  match_summary: string | null;
  whatsapp_message: string | null;
  status: string;
  approved_at: string | null;
  rejected_at: string | null;
  sent_at: string | null;
  sent_via: string | null;
  supplier_responded_at: string | null;
  match_breakdown: {
    kosher_types?: string[];
    certifications?: string[];
    reasons?: string[];
  } | null;
  request: {
    id: string;
    product_name: string | null;
    company: string | null;
    email: string | null;
    category: string | null;
  } | null;
  supplier: {
    company_name: string;
    country_of_origin: string | null;
  } | null;
};

export default async function MatchesPage() {
  const [{ data, error }, { data: templateData }] = await Promise.all([
    supabaseAdmin
      .from("sourcing_matches")
      .select(
        `id, request_id, supplier_id, match_score, product_name, company_name,
         country, match_summary, whatsapp_message, status, approved_at, rejected_at,
         sent_at, sent_via, supplier_responded_at,
         match_breakdown,
         request:sourcing_requests(id, product_name, company, email, category),
         supplier:supplier_offerings(company_name, country_of_origin)`
      )
      .order("match_score", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("supplier_email_templates")
      .select("id, name, channel, subject, body")
      .order("name"),
  ]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600 text-sm">Error loading matches: {error.message}</p>
      </main>
    );
  }

  const matches = (data ?? []) as unknown as MatchRow[];
  const templates = (templateData ?? []) as EmailTemplateRow[];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-base font-semibold text-gray-800">
          Match Dashboard
        </h1>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <MatchDashboardClient matches={matches} templates={templates} />
      </div>
    </main>
  );
}
