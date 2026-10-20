"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

export interface TradeTooltipProps {
  children?: ReactNode;
  term?: string;
  explanation: string;
  category?: "customs" | "shipping" | "finance" | "quality" | "legal";
  dir?: "rtl" | "ltr";
  className?: string;
}

export default function TradeTooltip({
  children,
  term,
  explanation,
  category = "customs",
  dir = "rtl",
  className = "",
}: TradeTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Category Badges & Colors
  const categoryConfig = {
    customs: { label: dir === "rtl" ? "מכס ורגולציה" : "Customs & Regulatory", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    shipping: { label: dir === "rtl" ? "שילוח ימי ולוגיסטיקה" : "Ocean Freight & Logistics", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
    finance: { label: dir === "rtl" ? "נאמנות ופיננסים" : "Escrow & Treasury", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    quality: { label: dir === "rtl" ? "בקרת איכות וכשרות" : "Quality & Kosher", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    legal: { label: dir === "rtl" ? "הסכמים ומשפט" : "Legal & Contracts", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  }[category];

  // Outside click handler for mobile
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    }
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible]);

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 group cursor-help ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      {/* Trigger Text / Children */}
      <span className="border-b border-dashed border-slate-400 hover:border-blue-400 transition-colors">
        {children || term}
      </span>

      {/* Info Icon Pin */}
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold bg-slate-700/80 text-slate-300 hover:bg-blue-600 hover:text-white transition-colors shrink-0">
        i
      </span>

      {/* Floating Tooltip Card */}
      {isVisible && (
        <span
          dir={dir}
          className={`absolute z-50 bottom-full mb-2 w-64 sm:w-72 p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 text-xs leading-relaxed pointer-events-auto animate-in fade-in zoom-in-95 duration-150 ${
            dir === "rtl" ? "right-1/2 translate-x-1/2" : "left-1/2 -translate-x-1/2"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Tag */}
          <span className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px]">
            <span className={`px-2 py-0.5 rounded-full font-bold border ${categoryConfig.color}`}>
              {categoryConfig.label}
            </span>
            <span className="text-slate-400 font-mono">FoodXchange Guide</span>
          </span>

          {/* Term Title */}
          {term && (
            <span className="block font-bold text-white text-xs mb-1">
              {term}
            </span>
          )}

          {/* Explanation Text */}
          <span className="block text-slate-300 text-[11px] leading-relaxed">
            {explanation}
          </span>

          {/* Tooltip Arrow */}
          <span
            className={`absolute top-full -mt-1 w-2.5 h-2.5 bg-slate-900 border-r border-b border-slate-700 rotate-45 ${
              dir === "rtl" ? "right-1/2 translate-x-1/2" : "left-1/2 -translate-x-1/2"
            }`}
          />
        </span>
      )}
    </span>
  );
}
