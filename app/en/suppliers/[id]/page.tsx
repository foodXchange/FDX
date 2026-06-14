import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getInitials } from "@/lib/admin/avatarPalette";
import { countryToFlag } from "@/lib/admin/countryFlag";

export const revalidate = 3600;

type Params = Promise<{ id: string }>;

type SupplierDetail = {
  id: string;
  company_name: string;
  logo_url: string | null;
  country_of_origin: string | null;
  website: string | null;
  categories: string[] | null;
  certifications: string[] | null;
  markets_served: string[] | null;
  product_description: string | null;
  private_label: boolean | null;
  own_brand: boolean | null;
  annual_capacity: string | null;
  headquarters: string | null;
  region: string | null;
  founded: string | null;
  company_size: string | null;
  verified: boolean | null;
  status: string | null;
  trust_score: number | null;
};

type SupplierProduct = {
  id: string;
  product_name: string;
  category: string | null;
  formats: string[] | null;
  certifications: string[] | null;
  kosher_types: string[] | null;
  image_url: string | null;
};

type SupplierFactory = {
  country: string | null;
  city: string | null;
  certifications_quality: string[] | null;
  certifications_dietary: string[] | null;
  kosher_types: string[] | null;
  kosher_certifying_body: string | null;
  kosher_passover: boolean | null;
  kosher_year_round: boolean | null;
  brc_grade: string | null;
  ifs_grade: string | null;
  production_capacity: string | null;
};

const getSupplier = cache(async (id: string): Promise<SupplierDetail | null> => {
  const { data } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, logo_url, country_of_origin, website, categories, certifications, markets_served, product_description, private_label, own_brand, annual_capacity, headquarters, region, founded, company_size, verified, status, trust_score"
    )
    .eq("id", id)
    .in("status", ["approved", "active"])
    .maybeSingle();
  return data as SupplierDetail | null;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supplier = await getSupplier(id);
  const canonical = `https://fdx.trading/en/suppliers/${id}`;

  if (!supplier) {
    return {
      title: "Supplier | FoodXchange",
      alternates: { canonical },
    };
  }

  const description =
    supplier.product_description?.slice(0, 200) ||
    `${supplier.company_name} — a supplier vetted by FoodXchange for the Israeli market.`;

  return {
    title: `${supplier.company_name} | FoodXchange Supplier Directory`,
    description,
    alternates: { canonical },
    openGraph: {
      title: supplier.company_name,
      description,
      url: canonical,
      type: "profile",
      siteName: "FoodXchange",
      images: [{ url: supplier.logo_url || "/og-default.png" }],
    },
  };
}

function whatsappUrl(companyName: string) {
  const phone = "972525222291";
  const message = encodeURIComponent(
    `Hi, I'd like to know more about ${companyName} on FoodXchange.`
  );
  return `https://wa.me/${phone}?text=${message}`;
}

function SupplierLogo({
  logoUrl,
  companyName,
  size,
}: {
  logoUrl: string | null;
  companyName: string;
  size: number;
}) {
  if (logoUrl) {
    return (
      <div
        className="relative shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5"
        style={{ width: size, height: size }}
      >
        <Image src={logoUrl} alt={companyName} fill className="object-contain" sizes={`${size}px`} />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-2xl border border-white/10 bg-slate-800 text-orange-400 flex items-center justify-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(companyName)}
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`text-xs px-3 py-1 rounded-full ${color}`}>{children}</span>;
}

export default async function SupplierProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) return notFound();

  const [productsResult, factoryResult] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .select("id, product_name, category, formats, certifications, kosher_types, image_url")
      .eq("supplier_id", id)
      .or("is_published.eq.true,is_published.is.null")
      .order("category", { ascending: true }),
    supabaseAdmin
      .from("supplier_factories")
      .select(
        "country, city, certifications_quality, certifications_dietary, kosher_types, kosher_certifying_body, kosher_passover, kosher_year_round, brc_grade, ifs_grade, production_capacity"
      )
      .eq("supplier_id", id)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);

  const products = (productsResult.data ?? []) as SupplierProduct[];
  const factory = factoryResult.data as SupplierFactory | null;

  const flag = countryToFlag(supplier.country_of_origin);
  const categories = supplier.categories ?? [];
  const certifications = supplier.certifications ?? [];
  const marketsServed = supplier.markets_served ?? [];

  const allCertifications = Array.from(
    new Set([
      ...certifications,
      ...(factory?.certifications_quality ?? []),
      ...(factory?.certifications_dietary ?? []),
    ])
  );

  const kosherLine = (() => {
    if (!factory) return null;
    const parts: string[] = [];
    if (factory.kosher_certifying_body) parts.push(factory.kosher_certifying_body);
    if (factory.kosher_passover) parts.push("Passover");
    if (factory.kosher_year_round) parts.push("Year-round");
    if ((factory.kosher_types ?? []).length > 0) parts.push((factory.kosher_types ?? []).join(", "));
    return parts.length > 0 ? `Kosher: ${parts.join(" · ")}` : null;
  })();

  const gradeLine = (() => {
    if (!factory) return null;
    const parts: string[] = [];
    if (factory.brc_grade) parts.push(`BRC Grade ${factory.brc_grade}`);
    if (factory.ifs_grade) parts.push(`IFS Grade ${factory.ifs_grade}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  })();

  const hasCertSection = allCertifications.length > 0 || kosherLine || gradeLine;

  const aboutStats = [
    supplier.company_size && { label: "Company size", value: supplier.company_size },
    supplier.founded && { label: "Founded", value: supplier.founded },
    supplier.annual_capacity && { label: "Annual capacity", value: supplier.annual_capacity },
  ].filter((s): s is { label: string; value: string } => Boolean(s));

  return (
    <main className="bg-slate-900">
      {/* HERO */}
      <section className="px-6 py-16 border-b border-slate-800">
        <div className="max-w-4xl mx-auto">
          <Link href="/en/suppliers" className="text-sm text-orange-400 hover:underline">
            ← Suppliers directory
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-6 mt-6">
            <SupplierLogo logoUrl={supplier.logo_url} companyName={supplier.company_name} size={80} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{supplier.company_name}</h1>
                {(supplier.trust_score ?? 0) >= 80 ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300">
                    ⭐ Top Supplier
                  </span>
                ) : (
                  (supplier.verified || (supplier.trust_score ?? 0) >= 60) && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-300">
                      ✓ Verified
                    </span>
                  )
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-400">
                {supplier.country_of_origin && (
                  <span>
                    {flag ? `${flag} ` : ""}
                    {supplier.country_of_origin}
                  </span>
                )}
                {supplier.headquarters && <span>{supplier.headquarters}</span>}
                {supplier.region && <span>{supplier.region}</span>}
                {supplier.website && (
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:underline"
                  >
                    {supplier.website} ↗
                  </a>
                )}
              </div>

              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {categories.map((c) => (
                    <Chip key={c} color="bg-orange-500/10 text-orange-300">
                      {c}
                    </Chip>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  href="/en/contact"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
                >
                  Request a quote →
                </Link>
                <a
                  href={whatsappUrl(supplier.company_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      {(supplier.product_description || aboutStats.length > 0 || supplier.private_label || supplier.own_brand) && (
        <section className="px-6 py-12 border-b border-slate-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">About</h2>

            {supplier.product_description && (
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                {supplier.product_description}
              </p>
            )}

            {(supplier.private_label || supplier.own_brand) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {supplier.private_label && (
                  <Chip color="bg-blue-500/10 text-blue-300">Private label available</Chip>
                )}
                {supplier.own_brand && (
                  <Chip color="bg-blue-500/10 text-blue-300">Own brand</Chip>
                )}
              </div>
            )}

            {aboutStats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                {aboutStats.map((stat) => (
                  <div key={stat.label} className="dark-card p-4">
                    <p className="text-sm font-semibold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PRODUCTS */}
      {products.length > 0 && (
        <section className="px-6 py-12 border-b border-slate-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-6">Products</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => {
                const chips = Array.from(
                  new Set([...(p.formats ?? []), ...(p.kosher_types ?? []), ...(p.certifications ?? [])])
                ).slice(0, 3);
                return (
                  <div key={p.id} className="dark-card overflow-hidden">
                    <div className="relative w-full h-32 bg-slate-800 flex items-center justify-center">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={p.product_name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <span className="text-slate-500 text-sm font-medium">{p.category ?? "Product"}</span>
                      )}
                    </div>
                    <div className="p-4">
                      {p.category && (
                        <Chip color="bg-orange-500/10 text-orange-300">{p.category}</Chip>
                      )}
                      <p className="text-sm font-medium text-white mt-2">{p.product_name}</p>
                      {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {chips.map((c) => (
                            <Chip key={c} color="bg-white/5 text-slate-400">
                              {c}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CERTIFICATIONS & COMPLIANCE */}
      {hasCertSection && (
        <section className="px-6 py-12 border-b border-slate-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Certifications &amp; Compliance</h2>
            {allCertifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allCertifications.map((c) => (
                  <Chip key={c} color="bg-blue-500/10 text-blue-300">
                    {c}
                  </Chip>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-1 text-sm text-slate-400">
              {kosherLine && <p>{kosherLine}</p>}
              {gradeLine && <p>{gradeLine}</p>}
            </div>
          </div>
        </section>
      )}

      {/* MARKETS SERVED */}
      {marketsServed.length > 0 && (
        <section className="px-6 py-12 border-b border-slate-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Markets Served</h2>
            <div className="flex flex-wrap gap-2">
              {marketsServed.map((m) => (
                <Chip key={m} color="bg-white/5 text-slate-300">
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT CTA */}
      <section className="py-16 text-center px-6">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Interested in {supplier.company_name}?
        </h2>
        <p className="text-slate-400 mb-6 max-w-xl mx-auto">
          Tell us what you&apos;re sourcing and we&apos;ll check the fit with this supplier.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/en/contact"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            Request a quote →
          </Link>
          <a
            href={whatsappUrl(supplier.company_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md font-semibold transition"
          >
            💬 WhatsApp
          </a>
          <Link
            href="/en/suppliers"
            className="btn-ghost px-6 py-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            ← Back to suppliers
          </Link>
        </div>
      </section>
    </main>
  );
}
