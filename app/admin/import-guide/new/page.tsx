import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ImportArticleForm from "@/components/admin/ImportArticleForm";

export default async function NewImportArticlePage() {
  const { data: portfolioData } = await supabaseAdmin
    .from("portfolio_items")
    .select("slug, title, category")
    .eq("published", true)
    .order("title");

  const portfolioItems = (portfolioData ?? []) as {
    slug: string;
    title: string;
    category: string;
  }[];

  return (
    <main className="min-h-screen bg-gray-50">
      <ImportArticleForm article={null} portfolioItems={portfolioItems} />
    </main>
  );
}
