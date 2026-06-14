import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateSupplier } from "@/app/admin/suppliers/actions";
import SupplierDetailTabs from "@/components/admin/SupplierDetailTabs";
import { SupplierQuickStats } from "@/components/admin/SupplierQuickStats";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";
import { countryToFlag } from "@/lib/admin/countryFlag";
import ImpersonateButton from "@/components/admin/ImpersonateButton";
import SupplierApprovalActions from "@/components/admin/SupplierApprovalActions";
import SupplierPendingMatches from "@/components/admin/SupplierPendingMatches";
import TrustScoreCard from "@/components/admin/TrustScoreCard";
import { calculateTrustScore } from "@/lib/suppliers/trustScore";

function SupplierStatusBadge({
  status,
  qualificationStatus,
}: {
  status: string | null;
  qualificationStatus: string | null;
}) {
  if (status === "approved" || status === "active") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        Approved
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        Pending
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        Rejected
      </span>
    );
  }
  const label = qualificationStatus === "empty" ? "Empty" : status ?? "Empty";
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      {label}
    </span>
  );
}

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [supplierResult, contactsResult, documentsResult, factoriesResult, productsResult, pendingMatchesResult, trustScoreBreakdown] =
    await Promise.all([
      supabaseAdmin
        .from("supplier_offerings")
        .select("*")
        .eq("id", id)
        .single(),
      supabaseAdmin
        .from("supplier_contacts")
        .select("*")
        .eq("supplier_id", id)
        .order("is_primary", { ascending: false }),
      supabaseAdmin
        .from("supplier_documents")
        .select("*")
        .eq("supplier_id", id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("supplier_factories")
        .select("*")
        .eq("supplier_id", id)
        .order("is_primary", { ascending: false }),
      supabaseAdmin
        .from("supplier_products")
        .select("*")
        .eq("supplier_id", id)
        .order("scrape_confidence", { ascending: false }),
      supabaseAdmin
        .from("sourcing_matches")
        .select("id, match_score, status, created_at, sourcing_requests(id, product_name, category, company)")
        .eq("supplier_id", id)
        .eq("status", "sent")
        .order("created_at", { ascending: false }),
      calculateTrustScore(id),
    ]);

  if (!supplierResult.data) return notFound();

  const supplier = supplierResult.data;
  const companyName = supplier.company_name as string;
  const logoUrl = supplier.logo_url as string | null;
  const country = supplier.country_of_origin as string | null;
  const website = supplier.website as string | null;
  const flag = countryToFlag(country);
  const { bg, text } = avatarColors(companyName);
  const products = (productsResult.data ?? []) as Parameters<typeof SupplierDetailTabs>[0]["products"];

  const bound = updateSupplier.bind(null, id);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a
          href="/admin/suppliers"
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          ← Suppliers
        </a>
        <span className="text-sm font-semibold text-gray-800">{companyName}</span>
        {supplier.verified && (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            ✓ Verified
          </span>
        )}
        <ImpersonateButton kind="supplier" id={id} label="View as supplier" />
        <TrustScoreCard supplierId={id} score={trustScoreBreakdown.total} breakdown={trustScoreBreakdown} />
        <span className="text-xs text-gray-400 ml-auto">
          Updated{" "}
          {supplier.updated_at
            ? new Date(supplier.updated_at as string).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-5 flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
          />
        ) : (
          <div
            className={`w-16 h-16 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold shrink-0 ${bg} ${text}`}
          >
            {getInitials(companyName)}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">{companyName}</h1>
            <SupplierStatusBadge
              status={supplier.status as string | null}
              qualificationStatus={supplier.qualification_status as string | null}
            />
            {supplier.status === "pending" && <SupplierApprovalActions id={id} />}
          </div>
          {country && (
            <span className="text-sm text-gray-500">
              {flag ? `${flag} ` : ""}
              {country}
            </span>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-600 hover:text-orange-700 truncate max-w-md"
            >
              {website} ↗
            </a>
          )}
        </div>
      </div>

      <SupplierQuickStats
        productCount={products.length}
        certificationCount={((supplier.certifications as string[] | null) ?? []).length}
        marketsCount={((supplier.markets_served as string[] | null) ?? []).length}
        lastScrapedAt={supplier.last_scraped_at as string | null}
      />

      <SupplierPendingMatches
        supplierId={id}
        matches={(pendingMatchesResult.data ?? []) as Parameters<typeof SupplierPendingMatches>[0]["matches"]}
      />

      <SupplierDetailTabs
        supplierId={id}
        initialData={supplierResult.data}
        contacts={(contactsResult.data ?? []) as Record<string, unknown>[]}
        documents={(documentsResult.data ?? []) as Record<string, unknown>[]}
        factories={(factoriesResult.data ?? []) as Parameters<typeof SupplierDetailTabs>[0]["factories"]}
        products={products}
        action={bound}
      />
    </main>
  );
}
