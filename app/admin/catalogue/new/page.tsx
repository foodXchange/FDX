import Link from "next/link";
import { createCatalogueProduct } from "@/app/admin/catalogue/actions";
import CatalogueProductForm from "@/components/admin/CatalogueProductForm";

export default function NewCatalogueProductPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Link
          href="/admin/catalogue"
          className="text-sm text-gray-500 hover:text-gray-700 transition flex items-center gap-1"
        >
          ← Catalogue
        </Link>
        <span className="text-sm font-semibold text-gray-800">New product</span>
      </div>

      <CatalogueProductForm
        action={createCatalogueProduct}
        redirectOnCreate="/admin/catalogue/[id]"
      />
    </main>
  );
}
