import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SourcingBoardFilter from "@/components/SourcingBoardFilter";

export const revalidate = 3600;

export type SourcingBoardRequest = {
  id: string;
  product_name: string | null;
  category: string | null;
  message: string | null;
  kosher_type?: string | null;
  kosher_required?: boolean | null;
  branding?: string | null;
  packaging_preference?: string | null;
  certifications: string[] | null;
  tags?: string[] | null;
  created_at: string;
  status: string | null;
  passover_kosher?: boolean | null;
  is_published?: boolean | null;
  published_product_name?: string | null;
  published_message?: string | null;
};

export const metadata: Metadata = {
  title: "Active Sourcing Requests — FoodXchange",
  description:
    "Live sourcing requests from Israeli food buyers. If you manufacture these products, tell us about your range.",
  alternates: {
    canonical: "https://fdx.trading/en/sourcing-board",
  },
  openGraph: {
    title: "Active Sourcing Requests — FoodXchange",
    description:
      "Live sourcing requests from Israeli food buyers. If you manufacture these products, tell us about your range.",
    url: "https://fdx.trading/en/sourcing-board",
    type: "website",
    siteName: "FoodXchange",
  },
};

export default async function SourcingBoardPage() {
  const { data } = await supabase
    .from("sourcing_requests")
    .select(
      "id, product_name, category, message, kosher_type, kosher_required, branding, packaging_preference, certifications, tags, created_at, status, passover_kosher, is_published, published_product_name, published_message"
    )
    .in("status", ["new", "reviewed", "matched"])
    .eq("is_published", true)
    .not("product_name", "is", null)
    .order("created_at", { ascending: false });

  const requests = (data ?? []).map((r) => ({
    ...r,
    product_name: (r.published_product_name as string | null) ?? r.product_name,
    message: (r.published_message as string | null) ?? r.message,
  })) as SourcingBoardRequest[];

  const uniqueCategories = [
    ...new Set(requests.map((r) => r.category).filter(Boolean)),
  ];

  // Fetch catalogue images per category for ghost image overlay
  type CategoryImageRow = { category: string; catalogue_image_url: string | null };
  let categoryImageMap: Record<string, string> = {};
  if (uniqueCategories.length > 0) {
    const { data: imgs } = await supabase
      .from("catalogue_products")
      .select("category,catalogue_image_url")
      .eq("status", "ready")
      .in("category", uniqueCategories as string[])
      .not("catalogue_image_url", "is", null)
      .limit(50);
    (imgs ?? []).forEach((p: CategoryImageRow) => {
      if (p.catalogue_image_url && !categoryImageMap[p.category]) {
        categoryImageMap[p.category] = p.catalogue_image_url;
      }
    });
  }

  return (
    <main className="bg-slate-900">

      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
            LIVE DEMAND
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            What Israeli buyers are sourcing right now
          </h1>
          <p className="text-slate-300 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
            Real active requests from Israeli retailers, importers, and food companies.
            If you manufacture any of these products, we want to hear from you.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {[
              `${requests.length} active requests`,
              `${uniqueCategories.length} product categories`,
              "Updated daily",
            ].map((badge) => (
              <span
                key={badge}
                className="bg-white/10 text-slate-300 text-sm px-4 py-2 rounded-full"
              >
                {badge}
              </span>
            ))}
          </div>
          <Link
            href="/en/manufacturers"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl text-lg mt-8 transition shadow"
          >
            You make one of these? Tell us →
          </Link>
        </div>
      </section>

      {/* FILTER + GRID */}
      <SourcingBoardFilter requests={requests} categoryImageMap={categoryImageMap} />

      {/* BOTTOM CTA */}
      <section className="bg-orange-500 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">You manufacture food products?</h2>
        <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
          We connect European and international food manufacturers with Israeli buyers.
          No commitment — just tell us what you make.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/en/manufacturers"
            className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-xl font-semibold text-lg transition shadow"
          >
            Submit your product range →
          </Link>
          <Link
            href="/en/about"
            className="border border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-medium text-lg transition"
          >
            How it works
          </Link>
        </div>
      </section>

    </main>
  );
}
