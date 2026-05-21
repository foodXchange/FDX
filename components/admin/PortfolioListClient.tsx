'use client';
import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import { togglePublished, deletePortfolioItem } from "@/app/admin/portfolio/actions";

type ListItem = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  published: boolean;
  priority: number;
  updated_at: string | null;
};

export default function PortfolioListClient({ items }: { items: ListItem[] }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.slug.toLowerCase().includes(q) ||
            (i.category ?? "").toLowerCase().includes(q)
        )
      : items;
  }, [items, query]);

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, slug, category…"
        className="w-full max-w-sm mb-6 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No items found</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Title", "Slug", "Category", "Status", "Priority", "Updated", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                    {item.title}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-30 truncate">{item.slug}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.published
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.priority}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(item.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/portfolio/${item.id}`}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 px-2 py-1 rounded border border-orange-200 hover:bg-orange-50 transition"
                      >
                        Edit
                      </Link>
                      <button
                        disabled={pending}
                        onClick={() =>
                          startTransition(() => { togglePublished(item.id, item.published); })
                        }
                        className="text-xs font-medium text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40"
                      >
                        {item.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${item.title}"? This cannot be undone.`
                            )
                          ) {
                            startTransition(() => { deletePortfolioItem(item.id); });
                          }
                        }}
                        className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
