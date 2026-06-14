import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 0;

type BlogPostRow = { status: string; updated_at: string | null; slug: string; title: string };
type NewsletterRow = { published: boolean | null };
type RequestRow = { status: string | null; id: string; product_name: string | null; company: string | null; created_at: string | null };
type RecentBlogRow = { slug: string; title: string; status: string; updated_at: string | null };
type RecentRequestRow = { id: string; product_name: string | null; company: string | null; status: string | null; created_at: string | null };

type ActivityItem =
  | { kind: "blog"; slug: string; title: string; status: string; date: string }
  | { kind: "request"; id: string; product: string | null; company: string | null; status: string | null; date: string };

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-slate-100 text-slate-600",
  review: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  new: "bg-orange-100 text-orange-700",
  pending: "bg-slate-100 text-slate-600",
};

export default async function AnalyticsPage() {
  const [
    { data: blogRows },
    { data: newsletterRows },
    { count: productsCount },
    { count: suppliersCount },
    { data: requestRows },
    { data: recentBlogs },
    { data: recentRequests },
  ] = await Promise.all([
    supabaseAdmin.from("blog_posts").select("status, updated_at, slug, title"),
    supabaseAdmin.from("newsletter_issues").select("published"),
    supabaseAdmin
      .from("supplier_products")
      .select("*", { count: "exact", head: true })
      .or("is_published.eq.true,is_published.is.null"),
    supabaseAdmin
      .from("supplier_offerings")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin.from("sourcing_requests").select("status, id, product_name, company, created_at"),
    supabaseAdmin
      .from("blog_posts")
      .select("slug, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("sourcing_requests")
      .select("id, product_name, company, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const blogs = (blogRows ?? []) as BlogPostRow[];
  const newsletters = (newsletterRows ?? []) as NewsletterRow[];
  const requests = (requestRows ?? []) as RequestRow[];

  // Blog post status breakdown
  const blogByStatus: Record<string, number> = {};
  for (const b of blogs) {
    blogByStatus[b.status] = (blogByStatus[b.status] ?? 0) + 1;
  }

  // Newsletter counts
  const newsletterPublished = newsletters.filter((n) => n.published).length;

  // Sourcing request new count
  const requestsNew = requests.filter((r) => r.status === "new").length;

  // Build activity feed
  const activityItems: ActivityItem[] = [
    ...(recentBlogs ?? []).map((b: RecentBlogRow) => ({
      kind: "blog" as const,
      slug: b.slug,
      title: b.title,
      status: b.status,
      date: b.updated_at ?? "",
    })),
    ...(recentRequests ?? []).map((r: RecentRequestRow) => ({
      kind: "request" as const,
      id: r.id,
      product: r.product_name,
      company: r.company,
      status: r.status,
      date: r.created_at ?? "",
    })),
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  const stats = [
    {
      label: "Blog Posts",
      value: blogs.length,
      sub: Object.entries(blogByStatus)
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => ({ label: s, count: n })),
      href: "/en/admin/blog-editor",
    },
    {
      label: "Newsletter Issues",
      value: newsletters.length,
      sub: [
        { label: "published", count: newsletterPublished },
        { label: "draft", count: newsletters.length - newsletterPublished },
      ],
      href: "/en/admin/newsletter-builder",
    },
    {
      label: "Products Published",
      value: productsCount ?? 0,
      sub: [],
      href: "/admin/products",
    },
    {
      label: "Suppliers",
      value: suppliersCount ?? 0,
      sub: [],
      href: "/admin/suppliers",
    },
    {
      label: "Sourcing Requests",
      value: requests.length,
      badge: requestsNew > 0 ? `${requestsNew} new` : null,
      sub: [],
      href: "/admin/requests",
    },
  ];

  return (
    <main className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/en/admin" className="text-sm text-slate-400 hover:text-slate-600 transition">
              ← Internal tools
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Live stats from Supabase</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
                {"badge" in s && s.badge && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {s.badge}
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-2 group-hover:text-orange-600 transition">
                {s.value.toLocaleString()}
              </p>
              {s.sub.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {s.sub.map((chip) => (
                    <span
                      key={chip.label}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[chip.label] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {chip.label} {chip.count}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* QA Metrics cross-link */}
        <Link
          href="/en/admin/qa-metrics"
          className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition group mb-10"
        >
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sourcing Funnel</p>
          <p className="text-lg font-semibold text-slate-900 mt-1 group-hover:text-orange-600 transition">
            QA Metrics dashboard →
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Buyer funnel, supplier performance, and bottleneck alerts
          </p>
        </Link>

        {/* Activity feed */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Activity</h2>
          </div>
          {activityItems.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">No recent activity</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activityItems.map((item, i) => (
                <li key={i} className="flex items-center gap-4 px-6 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      item.kind === "blog" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.kind === "blog" ? "Blog" : "Request"}
                  </span>
                  <span className="text-sm text-slate-800 flex-1 truncate">
                    {item.kind === "blog"
                      ? item.title
                      : item.product
                      ? `${item.product}${item.company ? ` — ${item.company}` : ""}`
                      : item.company ?? "Untitled request"}
                  </span>
                  {item.status && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[item.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {item.status}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 shrink-0">{relativeTime(item.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
