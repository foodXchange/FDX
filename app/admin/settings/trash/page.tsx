import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import TrashManager, { type TrashItem } from "@/components/admin/TrashManager";

export const revalidate = 0;

export default async function TrashPage() {
  const { data, error } = await supabaseAdmin
    .from("content_image_history")
    .select("id, trashed_object_path, changed_at")
    .not("trashed_object_path", "is", null)
    .order("changed_at", { ascending: false })
    .limit(30);

  const items = ((data ?? []) as TrashItem[]).filter((x) => x.trashed_object_path);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Trash</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Trashed content images — permanent deletion removes from Supabase storage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
          <Link
            href="/admin/settings/category-images"
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            ← Category images
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          Failed to load trash: {error.message}
        </div>
      )}

      <TrashManager items={items} supabaseUrl={supabaseUrl} />
    </main>
  );
}
