import BuyerForm from "@/components/admin/BuyerForm";
import { createBuyer } from "@/app/admin/buyers/actions";

type SearchParams = {
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
};

export default async function NewBuyerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a
          href="/admin/buyers"
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          ← Buyers
        </a>
        <span className="text-sm font-semibold text-gray-800">New buyer</span>
      </div>
      <BuyerForm
        action={createBuyer}
        redirectOnCreate="/admin/buyers"
        initialData={{
          company_name: params.company_name ?? "",
          contact_name: params.contact_name ?? "",
          contact_email: params.contact_email ?? "",
        }}
      />
    </main>
  );
}
