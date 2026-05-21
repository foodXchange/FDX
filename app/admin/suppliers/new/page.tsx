import SupplierForm from "@/components/admin/SupplierForm";
import { createSupplier } from "@/app/admin/suppliers/actions";

export default function NewSupplierPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a href="/admin/suppliers" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
          ← Suppliers
        </a>
        <span className="text-sm font-semibold text-gray-800">New supplier</span>
      </div>
      <SupplierForm action={createSupplier} redirectOnCreate="/admin/suppliers" />
    </main>
  );
}
