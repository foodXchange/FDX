import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminDocsHub, { type DocCategory, type DocArticle } from "@/components/admin/docs/AdminDocsHub";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Knowledge Base & System SOPs | FoodXchange Admin",
  description: "Browse all 54 platform architecture specifications, matching algorithms, scraper pipelines, and customer operating procedures.",
};

export default async function AdminDocsPage() {
  const [{ data: categoriesData }, { data: articlesData }] = await Promise.all([
    supabaseAdmin
      .from("kb_categories")
      .select("id, slug, title, description, display_order, is_public")
      .order("display_order"),
    supabaseAdmin
      .from("kb_articles")
      .select("id, slug, title, content_text, category_id, status, is_public, display_order, updated_at")
      .order("display_order"),
  ]);

  const categories = (categoriesData ?? []) as DocCategory[];
  const articles = (articlesData ?? []) as DocArticle[];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminDocsHub categories={categories} articles={articles} />
    </div>
  );
}
