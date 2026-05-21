'use client';
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePublished, deleteImportArticle } from "@/app/admin/import-guide/actions";

interface Props {
  id: string;
  published: boolean;
}

export default function ImportGuideRowActions({ id, published }: Props) {
  const router = useRouter();
  const [pendingToggle, startToggle] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  function handleToggle() {
    startToggle(async () => {
      const result = await togglePublished(id, published);
      if (!result.ok) alert(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    startDelete(async () => {
      const result = await deleteImportArticle(id);
      if (!result.ok) alert(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={pendingToggle}
        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 transition disabled:opacity-50"
      >
        {pendingToggle ? "..." : published ? "Unpublish" : "Publish"}
      </button>
      <button
        onClick={handleDelete}
        disabled={pendingDelete}
        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 transition disabled:opacity-50"
      >
        {pendingDelete ? "..." : "Delete"}
      </button>
    </div>
  );
}
