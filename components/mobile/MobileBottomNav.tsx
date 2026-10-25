"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSampleKit } from "@/context/SampleKitContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { items } = useSampleKit();

  // Hide on admin routes or if in print mode
  if (pathname.startsWith("/admin") || pathname.startsWith("/en/admin")) {
    return null;
  }

  const isHe = pathname.startsWith("/he");
  const homeHref = isHe ? "/he" : "/";
  const catalogHref = isHe ? "/he/products" : "/en/products";
  const containerHref = isHe ? "/he/calculator/container" : "/en/calculator/container";
  const trackHref = isHe ? "/he/track" : "/track";

  const isHomeActive = pathname === "/he" || pathname === "/";
  const isCatalogActive = pathname.includes("/products");
  const isCalculatorActive = pathname.includes("/calculator");
  const isTrackActive = pathname.includes("/track");

  const sampleCount = items.length;

  const triggerOpenCopilot = () => {
    window.dispatchEvent(new CustomEvent("fdx:open-copilot"));
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/92 backdrop-blur-xl border-t border-slate-800/80 md:hidden print:hidden shadow-2xl safe-area-pb"
      dir={isHe ? "rtl" : "ltr"}
    >
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {/* TAB 1: HOME */}
        <Link
          href={homeHref}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isHomeActive ? "text-orange-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px] mt-0.5 tracking-tight">{isHe ? "בית" : "Home"}</span>
        </Link>

        {/* TAB 2: CATALOG */}
        <Link
          href={catalogHref}
          className={`flex flex-col items-center justify-center h-full transition-colors relative ${
            isCatalogActive ? "text-orange-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-lg">📦</span>
          <span className="text-[10px] mt-0.5 tracking-tight">{isHe ? "קטלוג" : "Catalog"}</span>
        </Link>

        {/* TAB 3: CONTAINER & CALCULATOR */}
        <Link
          href={containerHref}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isCalculatorActive ? "text-orange-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <span className="text-lg">🚢</span>
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">{isHe ? "מכולות" : "Container"}</span>
        </Link>

        {/* TAB 4: TRACKING / SAMPLES */}
        <Link
          href={trackHref}
          className={`flex flex-col items-center justify-center h-full transition-colors relative ${
            isTrackActive ? "text-orange-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <span className="text-lg">🚚</span>
            {sampleCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {sampleCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">{isHe ? "מעקב" : "Track"}</span>
        </Link>

        {/* TAB 5: AI COPILOT */}
        <button
          onClick={triggerOpenCopilot}
          className="flex flex-col items-center justify-center h-full text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <span className="text-lg">🤖</span>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">{isHe ? "AI עזרה" : "Copilot"}</span>
        </button>
      </div>
    </div>
  );
}
