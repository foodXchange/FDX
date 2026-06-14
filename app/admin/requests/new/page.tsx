import type { Metadata } from "next";
import NewRequestForm from "@/components/admin/NewRequestForm";

export const metadata: Metadata = { title: "New Request | Admin" };

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer_id?: string; company?: string; name?: string; email?: string }>;
}) {
  const params = await searchParams;

  if (!params.buyer_id) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <p className="text-sm text-gray-500">Missing buyer_id.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a
          href={`/admin/buyers/${params.buyer_id}`}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          ← Buyer
        </a>
        <span className="text-sm font-semibold text-gray-800">Submit request on behalf of buyer</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <NewRequestForm
          buyerId={params.buyer_id}
          company={params.company ?? ""}
          name={params.name ?? ""}
          email={params.email ?? ""}
        />
      </div>
    </main>
  );
}
