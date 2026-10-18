import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import MatchDashboardClient from "@/components/admin/MatchDashboardClient";
import type { EmailTemplateRow } from "@/components/admin/EmailTemplatesClient";
import { getGmailCredentials } from "@/lib/email/gmailEngine";

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
  supplier_message?: string | null;
  product_image_url?: string | null;
  product_formats?: string[] | null;
  product_category?: string | null;
  match_breakdown: {
    kosher_types?: string[];
    certifications?: string[];
    reasons?: string[];
    source?: string;
    product_id?: string;
    image_url?: string | null;
    gmail_message_id?: string;
    gmail_subject?: string;
    followup_count?: number;
    last_reply_snippet?: string;
    last_reply_from?: string;
  } | null;
  request: {
    id: string;
    product_name: string | null;
    company: string | null;
    email: string | null;
    category: string | null;
    kosher: string | null;
    certifications: string[] | null;
    quantity: string | null;
    unit: string | null;
    notes: string | null;
    reference_image_urls: string[] | null;
  } | null;
  supplier: {
    id: string;
    company_name: string;
    country_of_origin: string | null;
    logo_url: string | null;
    website: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    certifications: string[] | null;
    kosher_types: string[] | null;
    trust_score: number | null;
  } | null;
};

export default async function MatchesPage() {
  const [{ data, error }, { data: templateData }, gmailCreds] =
    await Promise.all([
      supabaseAdmin
        .from("sourcing_matches")
        .select(
          `id, request_id, supplier_id, match_score, product_name, company_name,
           country, match_summary, whatsapp_message, status, approved_at, rejected_at,
           sent_at, sent_via, supplier_responded_at, supplier_message,
           match_breakdown,
           request:sourcing_requests(id, product_name, company, email, category, kosher, certifications, quantity, unit, notes, reference_image_urls),
           supplier:supplier_offerings(id, company_name, country_of_origin, logo_url, website, contact_email, contact_phone, certifications, kosher_types, trust_score)`
        )
        .order("match_score", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("supplier_email_templates")
        .select("id, name, channel, subject, body")
        .order("name"),
      getGmailCredentials(),
    ]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600 text-sm">
          Error loading matches: {error.message}
        </p>
      </main>
    );
  }

  const rawMatches = (data ?? []) as unknown as MatchRow[];
  const supplierIds = Array.from(
    new Set(rawMatches.map((m) => m.supplier_id).filter(Boolean))
  );

  // Lookup product images & formats from supplier_products for matched suppliers
  const productMapBySupplier = new Map<
    string,
    Array<{
      id: string;
      product_name: string;
      image_url: string | null;
      formats: string[] | null;
      category: string | null;
    }>
  >();

  if (supplierIds.length > 0) {
    const { data: spData } = await supabaseAdmin
      .from("supplier_products")
      .select("id, supplier_id, product_name, image_url, formats, category")
      .in("supplier_id", supplierIds.slice(0, 200))
      .limit(2000);

    for (const sp of spData ?? []) {
      const list = productMapBySupplier.get(sp.supplier_id) ?? [];
      list.push(sp);
      productMapBySupplier.set(sp.supplier_id, list);
    }
  }

  const matches: MatchRow[] = rawMatches.map((m) => {
    const candidates = productMapBySupplier.get(m.supplier_id) ?? [];
    const targetName = (m.product_name ?? "").toLowerCase().trim();
    const breakdownProductId = m.match_breakdown?.product_id;

    let bestProduct = breakdownProductId
      ? candidates.find((c) => c.id === breakdownProductId)
      : undefined;

    if (!bestProduct && targetName) {
      bestProduct =
        candidates.find(
          (c) => c.product_name.toLowerCase().trim() === targetName
        ) ??
        candidates.find(
          (c) =>
            c.product_name.toLowerCase().includes(targetName) ||
            targetName.includes(c.product_name.toLowerCase())
        );
    }
    if (!bestProduct && candidates.length > 0) {
      bestProduct = candidates.find((c) => c.image_url) ?? candidates[0];
    }

    return {
      ...m,
      product_image_url:
        m.match_breakdown?.image_url ?? bestProduct?.image_url ?? null,
      product_formats: bestProduct?.formats ?? null,
      product_category: bestProduct?.category ?? null,
    };
  });

  const templates = (templateData ?? []) as EmailTemplateRow[];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3.5 sticky top-0 z-10 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-900">
            Match &amp; Gmail Outreach Hub
          </h1>
          <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2.5 py-0.5 font-semibold">
            {matches.length} matches (Ranked 100→10)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            🎯 Open Product Benchmark Matcher →
          </Link>
          <Link
            href="/admin/requests"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            📋 Buyer Requests
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <MatchDashboardClient
          matches={matches}
          templates={templates}
          initialGmailConnected={!!gmailCreds}
          initialGmailUser={gmailCreds?.user ?? null}
        />
      </div>
    </main>
  );
}
