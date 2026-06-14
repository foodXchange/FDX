import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";
import PipPanel, { type PipV2CardData } from "@/components/admin/PipPanel";
import MatchCards from "./MatchCards";

export const metadata: Metadata = { title: "Request Detail | Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export type SavedMatch = {
  id: string;
  supplier_id: string;
  match_score: number;
  product_name: string;
  company_name: string;
  country: string | null;
  match_summary: string | null;
  whatsapp_message: string | null;
  match_breakdown: {
    reasons?: string[];
    score_breakdown?: Record<string, number>;
    kosher_types?: string[];
    certifications?: string[];
    category?: number;
    vector?: number;
    format?: number;
    compliance?: number;
    evidence?: number;
    kosher_status?: 'certified' | 'not_listed' | 'unknown';
  } | null;
  status: string;
  approved_at: string | null;
  rejected_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  closed_at: string | null;
  response_note: string | null;
  sent_via: string | null;
  supplier_response: "accepted" | "countered" | "declined" | null;
  supplier_message: string | null;
  supplier_responded_at: string | null;
};

export default async function RequestDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [{ data: request, error }, { data: rawMatches }, { data: rawV2Pips }] = await Promise.all([
    supabaseAdmin.from("sourcing_requests").select("*").eq("id", id).single(),
    supabaseAdmin
      .from("sourcing_matches")
      .select(
        "id, supplier_id, match_score, product_name, company_name, country, match_summary, whatsapp_message, match_breakdown, status, approved_at, rejected_at, sent_at, responded_at, closed_at, response_note, sent_via, supplier_response, supplier_message, supplier_responded_at"
      )
      .eq("request_id", id)
      .order("match_score", { ascending: false }),
    supabaseAdmin
      .from("pips")
      .select("id, product_family_key, data_json, status")
      .eq("sourcing_request_id", id)
      .eq("pip_version", 2)
      .eq("created_from", "image")
      .order("created_at", { ascending: true }),
  ]);

  if (error || !request) notFound();

  const productName = (request.product_name as string | null) ?? "";
  const cleanedName = productName ? cleanRequestName(productName) : "";
  const isNameCleaned = cleanedName !== productName && cleanedName.length > 0;

  const matches = (rawMatches ?? []) as SavedMatch[];

  // Supplier contact info (phone/email) for WhatsApp deep links and contact icons.
  const supplierIds = Array.from(new Set(matches.map((m) => m.supplier_id)));
  const { data: contactRows } = supplierIds.length
    ? await supabaseAdmin
        .from("supplier_contacts")
        .select("supplier_id, phone, email, scraped_at")
        .in("supplier_id", supplierIds)
        .order("scraped_at", { ascending: false })
    : { data: [] as { supplier_id: string; phone: string | null; email: string | null }[] };

  const contactMap: Record<string, { phone: string | null; email: string | null }> = {};
  for (const c of contactRows ?? []) {
    const entry = contactMap[c.supplier_id] ?? { phone: null, email: null };
    if (!entry.phone && c.phone) entry.phone = c.phone;
    if (!entry.email && c.email) entry.email = c.email;
    contactMap[c.supplier_id] = entry;
  }

  const v2Pips = (rawV2Pips ?? []) as PipV2CardData[];
  const certs = (request.certifications as string[] | null) ?? [];
  const hasKosher = certs.some((c) => c.toLowerCase().includes("kosher"));
  const intentJson = (request.intent_json as Record<string, unknown> | null) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Link
            href="/admin/requests"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Requests
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-700 truncate max-w-xs">
            {cleanedName || productName || "Request"}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── Left column: request details + PIP ── */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {cleanedName || productName || "—"}
                  </h1>
                  {isNameCleaned && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Original: {productName}
                    </p>
                  )}
                </div>
                <StatusBadge status={request.status as string | null} />
              </div>

              <div className="flex flex-wrap gap-2">
                {request.company && (
                  <span className="text-xs bg-slate-100 text-slate-700 rounded-full px-3 py-1 font-medium">
                    {request.company as string}
                  </span>
                )}
                {request.category && (
                  <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 font-medium">
                    {request.category as string}
                  </span>
                )}
                {hasKosher && (
                  <span className="text-xs bg-orange-50 text-orange-700 rounded-full px-3 py-1 font-medium">
                    ✡ Kosher required
                  </span>
                )}
                {(request.private_label as boolean | null) && (
                  <span className="text-xs bg-purple-50 text-purple-700 rounded-full px-3 py-1 font-medium">
                    Private label
                  </span>
                )}
              </div>

              {(request.message as string | null) && (
                <p className="mt-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                  {request.message as string}
                </p>
              )}

              {(request.created_at as string | null) && (
                <p className="mt-3 text-xs text-gray-400">
                  {new Date(request.created_at as string).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {/* PIP panel */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <PipPanel requestId={id} initialPip={intentJson} initialV2Pips={v2Pips} />
            </div>
          </div>

          {/* ── Right column: matches ── */}
          <div>
            <MatchCards
              requestId={id}
              initialMatches={matches}
              productName={productName}
              company={request.company as string | null}
              contactMap={contactMap}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "new";
  const styles: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    reviewed: "bg-yellow-100 text-yellow-700",
    matched: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600",
    sent: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
        styles[s] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {s}
    </span>
  );
}
