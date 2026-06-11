"use client";

import { useState } from "react";
import Link from "next/link";
import BuyerForm from "@/components/admin/BuyerForm";
import type { BuyerInput } from "@/app/admin/buyers/actions";

type Tab = "details" | "requests";

export type BuyerRequestRow = {
  id: string;
  product_name: string | null;
  category: string | null;
  status: string | null;
  created_at: string;
};

interface Props {
  buyerId: string;
  initialData: Partial<BuyerInput> & { id?: string };
  requests: BuyerRequestRow[];
  action: (data: BuyerInput) => Promise<{ ok: boolean; error?: string }>;
}

function StatusPill({ status }: { status: string | null }) {
  const s = status ?? "new";
  const cls =
    s === "new"
      ? "bg-blue-100 text-blue-700"
      : s === "reviewed"
      ? "bg-yellow-100 text-yellow-700"
      : s === "matched"
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s}</span>
  );
}

function RequestsTab({ requests }: { requests: BuyerRequestRow[] }) {
  if (requests.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-16">
        No sourcing requests linked to this buyer yet.
      </p>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Product", "Category", "Status", "Date"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/requests/${req.id}`}
                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    {req.product_name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {req.category ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={req.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(req.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BuyerDetailTabs({ buyerId, initialData, requests, action }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "details", label: "Details" },
    { id: "requests", label: "Requests", count: requests.length },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    activeTab === tab.id
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <BuyerForm action={action} initialData={{ ...initialData, id: buyerId }} />
      )}
      {activeTab === "requests" && <RequestsTab requests={requests} />}
    </div>
  );
}
