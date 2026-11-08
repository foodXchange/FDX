import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import EmailOutreachHubClient, {
  type OutreachMatchItem,
  type OutreachRequestOption,
  type OutreachThreadMessage,
} from "@/components/admin/EmailOutreachHubClient";

export const metadata: Metadata = {
  title: "Email & Outreach Hub | FoodXchange Mission Control",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ request_id?: string }>;
}

export default async function EmailOutreachHubPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const initialRequestId = sp.request_id || "all";

  // 1. Fetch active Sourcing Requests
  const { data: rawRequests, error: reqErr } = await supabaseAdmin
    .from("sourcing_requests")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (reqErr) {
    console.error("EmailOutreachHubPage rawRequests error:", reqErr);
  }

  const requests: OutreachRequestOption[] = (rawRequests || []).map((r: any) => ({
    id: r.id,
    shortTag: `FDX-REQ-${r.id.slice(0, 8).toUpperCase()}`,
    product_name: cleanRequestName(r.product_name || "Sourcing Inquiry"),
    company: r.company || null,
    category: r.category || null,
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    volume_per_year: r.volume_per_year || null,
    brief_status: r.brief_status || null,
    target_market: r.target_market || null,
    temperature_regime: r.temperature_regime || null,
    created_at: r.created_at || new Date().toISOString(),
  }));

  const activeRequestIds = new Set(requests.map((r) => r.id));

  // 2. Fetch Sourcing Matches across active requests
  const { data: rawMatches, error: matchErr } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      "id, request_id, supplier_id, company_name, product_name, country, match_score, status, sent_at, responded_at, supplier_responded_at, supplier_response, supplier_message, match_breakdown"
    )
    .order("match_score", { ascending: false })
    .limit(600);

  if (matchErr) {
    console.error("EmailOutreachHubPage rawMatches error:", matchErr);
  }

  const filteredRawMatches = (rawMatches || []).filter((m) =>
    activeRequestIds.has(m.request_id)
  );

  // 3. Batch-fetch supplier websites and contact emails from supplier_offerings & supplier_contacts
  const supplierIds = Array.from(
    new Set(filteredRawMatches.map((m) => m.supplier_id).filter(Boolean))
  );

  const offeringsMap: Record<
    string,
    { website: string | null; email: string | null; phone: string | null }
  > = {};

  if (supplierIds.length > 0) {
    const CHUNK = 200;
    for (let i = 0; i < supplierIds.length; i += CHUNK) {
      const slice = supplierIds.slice(i, i + CHUNK);
      const [{ data: offerings }, { data: contacts }] = await Promise.all([
        supabaseAdmin
          .from("supplier_offerings")
          .select("id, website, contact_email, contact_phone")
          .in("id", slice),
        supabaseAdmin
          .from("supplier_contacts")
          .select("supplier_id, email, phone")
          .in("supplier_id", slice),
      ]);

      for (const o of offerings || []) {
        offeringsMap[o.id] = {
          website: o.website || null,
          email: o.contact_email || null,
          phone: o.contact_phone || null,
        };
      }
      for (const c of contacts || []) {
        const cur = offeringsMap[c.supplier_id] || {
          website: null,
          email: null,
          phone: null,
        };
        if (!cur.email && c.email) cur.email = c.email;
        if (!cur.phone && c.phone) cur.phone = c.phone;
        offeringsMap[c.supplier_id] = cur;
      }
    }
  }

  // 4. Normalize into OutreachMatchItem[]
  const initialMatches: OutreachMatchItem[] = filteredRawMatches.map((m) => {
    const bd = (m.match_breakdown as Record<string, any> | null) || {};
    const suppMeta = offeringsMap[m.supplier_id] || {
      website: null,
      email: null,
      phone: null,
    };

    const rawHistory = Array.isArray(bd.outreach_history)
      ? (bd.outreach_history as OutreachThreadMessage[])
      : [];

    return {
      id: m.id,
      request_id: m.request_id,
      supplier_id: m.supplier_id,
      company_name: m.company_name || "Verified Manufacturer",
      product_name: m.product_name || "Matched Product",
      country: m.country || null,
      match_score: Number(m.match_score) || 0,
      status: m.status || "suggested",
      sent_at: m.sent_at || null,
      rfq_sent_at: bd.last_outreach_at || m.sent_at || null,
      responded_at: m.responded_at || null,
      supplier_responded_at: m.supplier_responded_at || null,
      supplier_response: m.supplier_response || null,
      supplier_message: m.supplier_message || null,
      website: bd.website || suppMeta.website || null,
      contact_email:
        bd.contact_email || bd.last_outreach_to || suppMeta.email || null,
      contact_phone: suppMeta.phone || null,
      delivery_status: bd.delivery_status || null,
      quote: bd.quote || null,
      matched_certifications: Array.isArray(bd.matched_certifications)
        ? bd.matched_certifications
        : Array.isArray(bd.certifications)
        ? bd.certifications
        : [],
      kosher_types: Array.isArray(bd.kosher_types) ? bd.kosher_types : [],
      last_outreach_subject: bd.last_outreach_subject || null,
      last_outreach_body: bd.last_outreach_body || null,
      last_outreach_at: bd.last_outreach_at || m.sent_at || null,
      outreach_history: rawHistory,
    };
  });

  return (
    <EmailOutreachHubClient
      requests={requests}
      initialMatches={initialMatches}
      initialRequestId={initialRequestId}
    />
  );
}
