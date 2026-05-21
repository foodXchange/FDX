import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ImportGuideGenerator from "@/components/admin/ImportGuideGenerator";
import ImportGuideRowActions from "@/components/admin/ImportGuideRowActions";
import PublishAllDraftsButton from "@/components/admin/PublishAllDraftsButton";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  published: boolean;
  reading_time_mins: number;
  updated_at: string;
};

export default async function AdminImportGuidePage() {
  const { data } = await supabaseAdmin
    .from("import_guide_articles")
    .select("id,title,slug,category,published,reading_time_mins,updated_at")
    .order("updated_at", { ascending: false });

  const articles = (data ?? []) as ArticleRow[];
  const publishedCount = articles.filter((a) => a.published).length;
  const draftCount = articles.length - publishedCount;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Import Guide CMS</span>
          <span className="text-xs text-gray-400">
            {publishedCount} published · {draftCount} drafts · {articles.length} total
          </span>
        </div>
        <div className="flex items-center gap-3">
          <PublishAllDraftsButton draftCount={draftCount} />
          <Link
            href="/admin/import-guide/new"
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
          >
            + New article
          </Link>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        {/* AI Generator */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
          <ImportGuideGenerator existingSlugs={articles.map((a) => a.slug)} />
        </div>

        {/* Articles table */}
        {articles.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                All articles
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Read
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => {
                  const cat = IMPORT_GUIDE_CATEGORIES.find(
                    (c) => c.slug === article.category
                  );
                  return (
                    <tr
                      key={article.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition last:border-0"
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <Link
                          href={`/admin/import-guide/${article.id}`}
                          className="font-medium text-gray-900 hover:text-orange-600 transition line-clamp-2"
                        >
                          {article.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {cat ? `${cat.icon} ${cat.title}` : article.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            article.published
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {article.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {article.reading_time_mins} min
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(article.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <ImportGuideRowActions
                          id={article.id}
                          published={article.published}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-sm">
            No articles yet. Use the AI generator above or{" "}
            <Link
              href="/admin/import-guide/new"
              className="text-orange-500 hover:underline"
            >
              create one manually
            </Link>
            .
          </div>
        )}
      </div>
    </main>
  );
}
