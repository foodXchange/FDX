import { Suspense } from "react";
import { fetchDealsList } from "@/app/admin/deals/actions";
import DealsDeskClient from "@/components/admin/deals/DealsDeskClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "B2B Commercial Deals & Pro-Forma Desk | FoodXchange Admin",
  description: "Manage binding B2B import contracts, 30/70 escrow milestones, and generate Priority ERP ASN manifests.",
};

export default async function AdminDealsPage() {
  const { deals } = await fetchDealsList();

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <Suspense fallback={<div className="text-white text-sm">Loading Commercial Deal Desk...</div>}>
        <DealsDeskClient initialDeals={deals} />
      </Suspense>
    </div>
  );
}
