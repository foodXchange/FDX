import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SuppliersDirectoryClient from "@/components/suppliers/SuppliersDirectoryClient";

export type PublicSupplierCard = {
  id: string;
  company_name: string;
  logo_url: string | null;
  country_of_origin: string | null;
  categories: string[];
  certifications: string[];
  markets_served: string[];
  product_description: string | null;
  website: string | null;
  verified: boolean;
  region: string | null;
  headquarters: string | null;
};

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Verified Food Suppliers for Israel | FoodXchange Directory",
  description:
    "Browse verified food manufacturers and suppliers vetted by FoodXchange for the Israeli market — by category, country, and certification.",
  alternates: { canonical: "https://fdx.trading/en/suppliers" },
  openGraph: {
    title: "Verified Food Suppliers for Israel | FoodXchange Directory",
    description:
      "Browse verified food manufacturers and suppliers vetted by FoodXchange for the Israeli market.",
    url: "https://fdx.trading/en/suppliers",
    type: "website",
    siteName: "FoodXchange",
  },
};

export default async function SuppliersDirectoryPage() {
  const { data } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, logo_url, country_of_origin, categories, certifications, markets_served, product_description, website, verified, region, headquarters"
    )
    .in("status", ["approved", "active"])
    .order("verified", { ascending: false })
    .order("company_name", { ascending: true });

  const suppliers = (data ?? []) as PublicSupplierCard[];

  const countryCount = new Set(
    suppliers.map((s) => s.country_of_origin).filter(Boolean)
  ).size;

  return (
    <main className="bg-slate-900">
      {/* HERO */}
      <section className="text-white py-20 px-6 text-center" style={{ background: "#0f1923" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
            SUPPLIER DIRECTORY
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Verified Suppliers for the Israeli Market
          </h1>
          <p className="text-slate-300 text-base mt-4 max-w-2xl mx-auto leading-relaxed">
            {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
            {countryCount > 0 ? ` across ${countryCount} countries` : ""}, vetted by FoodXchange
            for fit with active buyer requests.
          </p>
        </div>
      </section>

      {/* GRID */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <SuppliersDirectoryClient suppliers={suppliers} />
      </section>
    </main>
  );
}
