import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 0;

type BlogPost = {
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
};

type NewsletterIssue = {
  slug: string;
  title: string;
  created_at: string | null;
  published: boolean | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthLabel(iso: string | null): string {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function groupByMonth<T extends { published_at?: string | null; created_at?: string | null }>(
  items: T[],
  dateKey: "published_at" | "created_at"
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = monthLabel(item[dateKey] ?? null);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export default async function CalendarPage() {
  const today = new Date().toISOString();

  const [{ data: rawPosts }, { data: rawNewsletters }] = await Promise.all([
    supabaseAdmin
      .from("blog_posts")
      .select("slug, title, status, published_at")
      .or(`status.eq.scheduled,published_at.gte.${today}`)
      .order("published_at", { ascending: true })
      .limit(30),
    supabaseAdmin
      .from("newsletter_issues")
      .select("slug, title, created_at, published")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const posts = (rawPosts ?? []) as BlogPost[];
  const newsletters = (rawNewsletters ?? []) as NewsletterIssue[];

  const postsByMonth = groupByMonth(posts, "published_at");
  const newslettersByMonth = groupByMonth(newsletters, "created_at");

  return (
    <main className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-1">
            <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-600 transition">
              ← Internal tools
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Content Calendar</h1>
          <p className="text-slate-500 text-sm mt-1">Scheduled blog posts and recent newsletter issues</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Blog posts */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Upcoming Posts
              </h2>
              <Link
                href="/en/admin/blog-editor"
                className="text-xs text-orange-600 hover:text-orange-700 font-medium transition"
              >
                Open editor →
              </Link>
            </div>

            {posts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-slate-400 text-sm">No scheduled posts</p>
                <Link
                  href="/en/admin/blog-editor"
                  className="text-xs text-orange-600 hover:underline mt-2 inline-block"
                >
                  Schedule a post in the blog editor
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {Array.from(postsByMonth.entries()).map(([month, monthPosts]) => (
                  <div key={month}>
                    <div className="px-6 py-2 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{month}</p>
                    </div>
                    {monthPosts.map((post) => (
                      <div key={post.slug} className="flex items-center gap-3 px-6 py-3">
                        <div className="w-10 shrink-0 text-center">
                          <span className="text-xs font-bold text-slate-700 leading-none block">
                            {post.published_at
                              ? new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric" })
                              : "—"}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {post.published_at
                              ? new Date(post.published_at).toLocaleDateString("en-GB", { month: "short" })
                              : ""}
                          </span>
                        </div>
                        <p className="flex-1 text-sm text-slate-800 truncate">{post.title}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            post.status === "published"
                              ? "bg-green-100 text-green-700"
                              : post.status === "scheduled"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Newsletters */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Newsletter Issues
              </h2>
              <Link
                href="/en/admin/newsletter-builder"
                className="text-xs text-orange-600 hover:text-orange-700 font-medium transition"
              >
                Open builder →
              </Link>
            </div>

            {newsletters.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-slate-400 text-sm">No newsletter issues yet</p>
                <Link
                  href="/en/admin/newsletter-builder"
                  className="text-xs text-orange-600 hover:underline mt-2 inline-block"
                >
                  Create your first issue
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {Array.from(newslettersByMonth.entries()).map(([month, issues]) => (
                  <div key={month}>
                    <div className="px-6 py-2 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{month}</p>
                    </div>
                    {issues.map((issue) => (
                      <div key={issue.slug} className="flex items-center gap-3 px-6 py-3">
                        <div className="w-10 shrink-0 text-center">
                          <span className="text-xs font-bold text-slate-700 leading-none block">
                            {issue.created_at
                              ? new Date(issue.created_at).toLocaleDateString("en-GB", { day: "numeric" })
                              : "—"}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {issue.created_at
                              ? new Date(issue.created_at).toLocaleDateString("en-GB", { month: "short" })
                              : ""}
                          </span>
                        </div>
                        <p className="flex-1 text-sm text-slate-800 truncate">{issue.title}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            issue.published
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {issue.published ? "published" : "draft"}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Showing upcoming scheduled posts and last 10 newsletter issues ·{" "}
          <Link href="/en/admin/analytics" className="hover:text-slate-600 underline">
            View full analytics →
          </Link>
        </p>
      </div>
    </main>
  );
}
