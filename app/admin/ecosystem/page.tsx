import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  EcosystemDirectoryClient,
  type EcosystemPartnerRow,
} from "@/components/admin/ecosystem/EcosystemDirectoryClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ sector?: string; category?: string; q?: string }>;
}

export default async function AdminEcosystemPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialSector = resolvedSearchParams.sector || "all";
  const initialCategory = resolvedSearchParams.category || "all";

  const { data: partnersData, error } = await supabaseAdmin
    .from("supplier_offerings")
    .select(`
      id,
      company_name,
      sector,
      business_role,
      taxonomy_category,
      country_of_origin,
      website,
      offerings_summary,
      product_description,
      capabilities,
      taxonomy_tags,
      contact_email,
      contact_phone,
      contact_name,
      logo_url,
      is_potential_buyer,
      created_at
    `)
    .neq("sector", "food_beverage")
    .not("sector", "is", null)
    .order("company_name", { ascending: true });

  if (error) {
    console.error("Failed to fetch ecosystem partners:", error);
  }

  const partners = (partnersData ?? []) as EcosystemPartnerRow[];

  return (
    <main className="min-h-screen bg-slate-50/70">
      {/* Top Navigation Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <span className="text-sm font-extrabold text-slate-900 tracking-tight">
              Trade Partners &amp; Non-Food Ecosystem
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{partners.length}</span> Verified Partners
            <span className="text-slate-300">&bull;</span>
            <span>Turnkey Deal Enablers</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/analytics"
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            📊 Analytics
          </Link>
          <Link
            href="/admin/buyers?tab=discovered"
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            🎯 Discovered Buyers
          </Link>
          <Link
            href="/admin/suppliers"
            className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-xs"
          >
            🏭 Food Producers
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <EcosystemDirectoryClient
          initialPartners={partners}
          initialSector={initialSector}
          initialCategory={initialCategory}
        />
      </div>
    </main>
  );
}
