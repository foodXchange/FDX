"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BuyerConciergeAction } from "./BuyerActionConciergeBanner";

interface Props {
  action: BuyerConciergeAction;
  productName: string;
  lang?: "he" | "en";
}

export default function BuyerStickyMobileActionDock({
  action,
  productName,
  lang = "he",
}: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isRtl = lang === "he";

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down more than 350px
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible || isDismissed) return null;

  return (
    <aside
      aria-label="Floating Action Dock"
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed bottom-3 inset-x-3 z-40 sm:hidden animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-slate-100">
        {/* Info Left/Right */}
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {action.badgeLabel}
            </span>
          </div>
          <div className="text-xs font-bold text-white truncate max-w-[180px]">
            {action.title}
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {action.buttonActionType === "link" && action.targetLink ? (
            <Link
              href={action.targetLink}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <span>{action.buttonIcon || "🚀"}</span>
              <span>{action.buttonText.slice(0, 16)}</span>
              <span>&larr;</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onButtonClick}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{action.buttonIcon || "⚡"}</span>
              <span>{action.buttonText.slice(0, 16)}</span>
              <span>&larr;</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
            title={isRtl ? "סגור סרגל צף" : "Dismiss floating bar"}
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
