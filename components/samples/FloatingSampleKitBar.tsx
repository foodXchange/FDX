"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSampleKit } from "@/context/SampleKitContext";

export default function FloatingSampleKitBar() {
  const { items, openKit } = useSampleKit();
  const pathname = usePathname();
  const isHe = pathname?.startsWith("/he") ?? false;

  if (items.length === 0 || (pathname && pathname.startsWith("/admin"))) return null;

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[92vw] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <button
        onClick={openKit}
        className="w-full sm:w-auto flex items-center justify-between gap-3.5 bg-slate-900/95 hover:bg-slate-850 backdrop-blur-2xl border border-orange-500/40 hover:border-orange-500 text-white px-4 sm:px-5 py-3 rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-orange-500/30 transition-all hover:scale-[1.02] cursor-pointer group"
      >
        {/* Count Badge & Thumbnails preview */}
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-black shrink-0 shadow-md">
            {items.length}
          </span>

          {/* Overlapping thumbnail stack */}
          <div className="flex -space-x-2 overflow-hidden shrink-0" dir="ltr">
            {items.slice(0, 3).map((item, idx) => (
              <div
                key={item.id}
                className="relative w-7 h-7 rounded-full bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center text-[10px]"
                style={{ zIndex: 3 - idx }}
              >
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>📦</span>
                )}
              </div>
            ))}
          </div>

          <div className="text-start">
            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-orange-400 transition leading-tight">
              {isHe
                ? `ערכת טעימות לשולחן הרשת (${items.length} מוצרים)`
                : `Tasting Sample Box (${items.length} items)`}
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              {isHe ? "שילוח מהיר באקספרס (DHL/FedEx) ישירות למשרדיכם" : "Express courier dispatch directly to your office"}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <span className="bg-orange-500 group-hover:bg-orange-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shrink-0 transition shadow-sm">
          {isHe ? "הזמן דוגמאות ←" : "Order Kit →"}
        </span>
      </button>
    </div>
  );
}
