'use client';
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishAllDrafts } from "@/app/admin/import-guide/actions";

export default function PublishAllDraftsButton({ draftCount }: { draftCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (draftCount === 0) return null;

  function handleClick() {
    if (!confirm(`Publish all ${draftCount} draft articles now?`)) return;
    startTransition(async () => {
      const result = await publishAllDrafts();
      if (result.ok) {
        alert(`Published ${result.count} articles.`);
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-50"
    >
      {pending ? "Publishing…" : `Publish all ${draftCount} drafts`}
    </button>
  );
}
