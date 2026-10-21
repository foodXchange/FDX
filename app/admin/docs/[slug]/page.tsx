import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import KbBlockContent, { type KbBlock } from "@/components/help/KbBlockContent";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const { data: article } = await supabaseAdmin
    .from("kb_articles")
    .select("title")
    .eq("slug", slug)
    .single();

  return {
    title: `${article?.title || "Document"} | FoodXchange Admin Docs`,
  };
}

export default async function AdminDocDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  const { data: article } = await supabaseAdmin
    .from("kb_articles")
    .select("id, slug, title, content, content_text, category_id, status, is_public, author_name, updated_at, created_at")
    .eq("slug", slug)
    .single();

  if (!article) return notFound();

  const [{ data: category }, { data: categoryArticles }] = await Promise.all([
    supabaseAdmin
      .from("kb_categories")
      .select("id, slug, title, description, is_public")
      .eq("id", article.category_id)
      .single(),
    supabaseAdmin
      .from("kb_articles")
      .select("id, slug, title, is_public, display_order")
      .eq("category_id", article.category_id)
      .order("display_order"),
  ]);

  const blocks = (article.content as unknown as KbBlock[]) ?? [];
  const isInternal = !article.is_public;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── BREADCRUMBS & TOP BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <nav className="flex items-center gap-2 text-slate-500 font-medium flex-wrap">
          <Link href="/admin/docs" className="text-slate-600 hover:text-orange-600 transition">
            📚 Knowledge Base
          </Link>
          <span>/</span>
          <span className="text-slate-600">{category?.title || "Section"}</span>
          <span>/</span>
          <span className="text-slate-900 font-bold truncate max-w-xs">{article.title}</span>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {article.is_public && (
            <Link
              href={`/en/help/${article.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              <span>View Public Version</span>
              <span className="text-[10px]">↗</span>
            </Link>
          )}

          <Link
            href="/admin/docs"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
          >
            ← Back to Docs Hub
          </Link>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT: DOCUMENT READER + SIDEBAR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Document Content Pane (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Article Header Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                  isInternal
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                }`}
              >
                {isInternal ? "🔒 Internal SOP & Technical Spec" : "🌐 Public Customer-Facing Guide"}
              </span>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Category: {category?.title || "General"}
              </span>

              <span className="text-xs text-slate-400 ml-auto">
                Updated {new Date(article.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {article.title}
            </h1>

            {category?.description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Part of the <strong className="text-slate-700">{category.title}</strong> module — {category.description}
              </p>
            )}
          </div>

          {/* Document Body Reader */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl text-slate-200">
            {blocks.length > 0 ? (
              <KbBlockContent blocks={blocks} />
            ) : article.content_text ? (
              <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-slate-200 space-y-4">
                {article.content_text}
              </div>
            ) : (
              <p className="text-slate-400 italic">No content recorded for this document.</p>
            )}
          </div>
        </div>

        {/* Sidebar Pane (1 col) */}
        <div className="space-y-4">
          {/* In This Section Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 sticky top-20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                In This Section
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {categoryArticles?.length ?? 0} docs
              </span>
            </div>

            <div className="space-y-1">
              {(categoryArticles ?? []).map((item) => {
                const isActive = item.slug === article.slug;
                return (
                  <Link
                    key={item.id}
                    href={`/admin/docs/${item.slug}`}
                    className={`block px-3 py-2 rounded-xl text-xs transition leading-snug ${
                      isActive
                        ? "bg-orange-500 text-white font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate">{item.title}</span>
                      <span className="text-[9px] shrink-0 opacity-80">
                        {item.is_public ? "🌐" : "🔒"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <Link
                href="/admin/docs"
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 transition"
              >
                <span>Browse All Categories</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
