import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SupplierForm from "@/components/admin/SupplierForm";
import { updateSupplier } from "@/app/admin/suppliers/actions";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return notFound();

  const bound = updateSupplier.bind(null, id);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a href="/admin/suppliers" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
          ← Suppliers
        </a>
        <span className="text-sm font-semibold text-gray-800">{data.name as string}</span>
        <span className="text-xs text-gray-400 ml-auto">
          Updated{" "}
          {data.updated_at
            ? new Date(data.updated_at as string).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>
      <SupplierForm action={bound} initialData={data} />
    </main>
  );
}
