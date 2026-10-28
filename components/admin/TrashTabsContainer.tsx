"use client";

import { useState } from "react";
import TrashManager, { type TrashItem } from "@/components/admin/TrashManager";
import TrashRequestsManager, { type TrashedRequestItem } from "@/components/admin/TrashRequestsManager";

interface Props {
  imageItems: TrashItem[];
  requestItems: TrashedRequestItem[];
  supabaseUrl: string;
}

export default function TrashTabsContainer({
  imageItems,
  requestItems,
  supabaseUrl,
}: Props) {
  const [activeTab, setActiveTab] = useState<"requests" | "images">("requests");

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === "requests"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        >
          <span>📋</span>
          <span>Sourcing Requests</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "requests" ? "bg-white/20 text-white" : "bg-white text-slate-700"
            }`}
          >
            {requestItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("images")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === "images"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        >
          <span>🖼️</span>
          <span>Content Images</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === "images" ? "bg-white/20 text-white" : "bg-white text-slate-700"
            }`}
          >
            {imageItems.length}
          </span>
        </button>
      </div>

      {/* Tab Views */}
      {activeTab === "requests" ? (
        <TrashRequestsManager initialRequests={requestItems} />
      ) : (
        <TrashManager items={imageItems} supabaseUrl={supabaseUrl} />
      )}
    </div>
  );
}
