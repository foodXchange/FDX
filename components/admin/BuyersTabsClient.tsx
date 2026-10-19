"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BuyersTableClient, type BuyerRow } from "@/components/admin/BuyersTableClient";
import { DiscoveredBuyersTable, type DiscoveredBuyerRow } from "@/components/admin/DiscoveredBuyersTable";

interface Props {
  buyers: BuyerRow[];
  discoveredBuyers: DiscoveredBuyerRow[];
  initialTab?: "active" | "discovered";
}

export function BuyersTabsClient({ buyers, discoveredBuyers, initialTab = "active" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"active" | "discovered">(
    tabParam === "discovered" ? "discovered" : initialTab
  );

  useEffect(() => {
    if (tabParam === "discovered" || tabParam === "active") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const setTab = (tab: "active" | "discovered") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const unpromotedDiscoveredCount = discoveredBuyers.filter((b) => !b.is_promoted).length;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-2xl w-fit">
          <button
            onClick={() => setTab("active")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "active"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>💼 Enterprise Buyers</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === "active"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-300 text-slate-700"
              }`}
            >
              {buyers.length}
            </span>
          </button>

          <button
            onClick={() => setTab("discovered")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "discovered"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🎯 Discovered Wholesale Buyers</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === "discovered"
                  ? "bg-emerald-100 text-emerald-700 font-bold"
                  : "bg-slate-300 text-slate-700"
              }`}
            >
              {discoveredBuyers.length}
            </span>
            {unpromotedDiscoveredCount > 0 && (
              <span className="hidden md:inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-extrabold animate-pulse">
                {unpromotedDiscoveredCount} New
              </span>
            )}
          </button>
        </div>

        {activeTab === "discovered" && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Auto-detected during scraping · Ready for 1-click promotion
            </span>
          </div>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === "active" ? (
        <BuyersTableClient buyers={buyers} />
      ) : (
        <DiscoveredBuyersTable initialBuyers={discoveredBuyers} />
      )}
    </div>
  );
}
