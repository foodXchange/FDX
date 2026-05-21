import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ImportArticleForm from "@/components/admin/ImportArticleForm";

export default async function EditImportArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: article } = await supabaseAdmin
    .from("import_guide_articles")
    .select("*")
    .eq("id", id)
    .single();

  if (!article) return notFound();

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
      <ImportArticleForm article={article} portfolioItems={portfolioItems} />
    </main>
  );
}
