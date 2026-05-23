import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import PortfolioGrid from "@/components/PortfolioGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sourcing Scenarios | FoodXchange",
  description: "Real sourcing work — categories, formats, and markets we actively cover.",
};

type PortfolioItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  hero_image: string | null;
  priority: number | null;
};

async function getItems(): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("id, title, slug, summary, category, hero_image, priority")
    .eq("published", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Portfolio fetch error:", error);
    return [];
  }
  return (data || []) as PortfolioItem[];
}

export default async function PortfolioPage() {
  const items = await getItems();

  return (
    <main>

      {/* HERO */}
      <section className="bg-linear-to-b from-slate-900 to-slate-800 text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Sourcing Scenarios
          </h1>
          <p className="mt-4 text-slate-300">
            Real sourcing work — categories, formats, and markets we actively cover.
          </p>
        </div>
      </section>

      {/* GRID */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <PortfolioGrid items={items} />
      </section>

    </main>
  );
}
