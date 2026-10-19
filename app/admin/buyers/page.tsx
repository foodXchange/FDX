import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { BuyerRow } from "@/components/admin/BuyersTableClient";
import { BuyersTabsClient } from "@/components/admin/BuyersTabsClient";
import type { DiscoveredBuyerRow } from "@/components/admin/DiscoveredBuyersTable";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function AdminBuyersPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTab = resolvedSearchParams.tab === "discovered" ? "discovered" : "active";

  const [buyersResult, requestsResult, discoveredResult] = await Promise.all([
    supabaseAdmin
      .from("buyers")
      .select("id, company_name, logo_url, contact_name, contact_email, country, buyer_type, active, website")
      .order("company_name", { ascending: true }),
    supabaseAdmin
      .from("sourcing_requests")
      .select("buyer_id")
      .not("buyer_id", "is", null),
    supabaseAdmin
      .from("supplier_offerings")
      .select("id, company_name, website, country_of_origin, business_role, contact_name, contact_email, contact_phone, offerings_summary, product_description, internal_notes, logo_url")
      .eq("is_potential_buyer", true)
      .order("company_name", { ascending: true }),
  ]);

  const requestCounts = new Map<string, number>();
  for (const row of requestsResult.data ?? []) {
    const buyerId = (row as { buyer_id: string | null }).buyer_id;
    if (!buyerId) continue;
    requestCounts.set(buyerId, (requestCounts.get(buyerId) ?? 0) + 1);
  }

  const buyers: BuyerRow[] = (buyersResult.data ?? []).map((buyer) => ({
    ...(buyer as Omit<BuyerRow, "request_count">),
    request_count: requestCounts.get(buyer.id) ?? 0,
  }));

  // Build lookup index of existing buyers by lowercase name & website
  const existingBuyersByName = new Map<string, string>();
  for (const b of buyersResult.data ?? []) {
    if (b.company_name) existingBuyersByName.set(b.company_name.trim().toLowerCase(), b.id);
  }

  const discoveredBuyers: DiscoveredBuyerRow[] = (discoveredResult.data ?? []).map((item) => {
    const noteMatch = (item.internal_notes ?? "").match(/Promoted to active buyer directory \(ID: ([^)]+)\)/);
    const idFromNote = noteMatch ? noteMatch[1].trim() : null;
    const matchedId = idFromNote || existingBuyersByName.get((item.company_name || "").trim().toLowerCase()) || null;

    return {
      id: item.id,
      company_name: item.company_name || "Unknown Company",
      website: item.website,
      country_of_origin: item.country_of_origin,
      business_role: item.business_role,
      contact_name: item.contact_name,
      contact_email: item.contact_email,
      contact_phone: item.contact_phone,
      offerings_summary: item.offerings_summary,
      product_description: item.product_description,
      internal_notes: item.internal_notes,
      logo_url: item.logo_url,
      is_promoted: Boolean(matchedId),
      promoted_buyer_id: matchedId,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50/70">
      <div className="border-b border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-4">
          <span className="text-sm font-extrabold text-slate-900 tracking-tight">
            Enterprise Buyers &amp; Inbound Radar
          </span>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{buyers.length}</span> Active
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-emerald-700">{discoveredBuyers.length}</span> Discovered Leads
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/analytics"
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            📊 Analytics
          </Link>
          <Link
            href="/admin/buyers/new"
            className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-xs"
          >
            + Add buyer
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <BuyersTabsClient
          buyers={buyers}
          discoveredBuyers={discoveredBuyers}
          initialTab={initialTab}
        />
      </div>
    </main>
  );
}
