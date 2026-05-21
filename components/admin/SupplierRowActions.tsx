"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSupplier } from "@/app/admin/suppliers/actions";

interface Props {
  id: string;
}

export default function SupplierRowActions({ id }: Props) {
  const router = useRouter();
  const [pending, startDelete] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this supplier? This cannot be undone.")) return;
    startDelete(async () => {
      const result = await deleteSupplier(id);
      if (!result.ok) alert(result.error);
      else router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs text-red-500 hover:text-red-700 transition disabled:opacity-50"
    >
      {pending ? "..." : "Delete"}
    </button>
  );
}
