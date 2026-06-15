import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import MediaGrid, { type MediaItem } from "@/components/admin/MediaGrid";

export const revalidate = 0;

const BUCKET = "blog-images";
const FOLDER = "posts";

export default async function MediaPage() {
  const { data: files, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(FOLDER, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  const items: MediaItem[] = (files ?? [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => ({
      name: f.name,
      path: `${FOLDER}/${f.name}`,
      url: supabaseAdmin.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${f.name}`).data.publicUrl,
      size: (f.metadata as { size?: number } | null)?.size ?? 0,
      createdAt: f.created_at ?? null,
    }));

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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Media Library</h1>
              <p className="text-slate-500 text-sm mt-1">
                Images in the <code className="bg-slate-100 px-1 rounded text-xs">blog-images/posts/</code> storage bucket
              </p>
            </div>
            <div className="text-sm text-slate-400">
              {items.length} {items.length === 1 ? "file" : "files"}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            Could not load storage files: {error.message}
            {error.message.includes("not found") || error.message.includes("does not exist") ? (
              <span className="block mt-1 text-xs">
                Create a public bucket named <strong>blog-images</strong> in your Supabase Storage dashboard.
              </span>
            ) : null}
          </div>
        )}

        <MediaGrid items={items} />
      </div>
    </main>
  );
}
