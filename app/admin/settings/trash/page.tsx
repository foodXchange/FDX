import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { type TrashItem } from "@/components/admin/TrashManager";
import { type TrashedRequestItem } from "@/components/admin/TrashRequestsManager";
import TrashTabsContainer from "@/components/admin/TrashTabsContainer";

export const revalidate = 0;

export default async function TrashPage() {
  const [imagesResult, requestsResult] = await Promise.all([
    supabaseAdmin
      .from("content_image_history")
      .select("id, trashed_object_path, changed_at")
      .not("trashed_object_path", "is", null)
      .order("changed_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("sourcing_requests")
      .select("id, product_name, company, name, email, deleted_at, deleted_by, brief_status, status, created_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(50),
  ]);

  const imageItems = ((imagesResult.data ?? []) as TrashItem[]).filter((x) => x.trashed_object_path);
  const requestItems = (requestsResult.data ?? []) as TrashedRequestItem[];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const totalTrashCount = imageItems.length + requestItems.length;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Trash & Archive</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Archived sourcing requests and trashed media — restore or permanently delete
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 font-medium">
            {totalTrashCount} {totalTrashCount === 1 ? "item" : "items"}
          </span>
          <Link
            href="/admin/requests"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition"
          >
            ← Sourcing Deal Desk
          </Link>
        </div>
      </div>

      {(imagesResult.error || requestsResult.error) && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          Failed to load some trash items: {imagesResult.error?.message || requestsResult.error?.message}
        </div>
      )}

      <TrashTabsContainer
        imageItems={imageItems}
        requestItems={requestItems}
        supabaseUrl={supabaseUrl}
      />
    </main>
  );
}
