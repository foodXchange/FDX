"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import BuyerPanel from "@/components/sourcing/BuyerPanel";
import SupplierPanel from "@/components/sourcing/SupplierPanel";

export default function FloatingSourcingButton() {
  const [fabOpen, setFabOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"buyer" | "supplier" | null>(
    null
  );
  const fabRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!fabOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fabOpen]);

  if (
    pathname.includes("/sourcing") ||
    pathname.includes("/contact") ||
    pathname.includes("/buyers")
  ) {
    return null;
  }

  function openBuyer() {
    setFabOpen(false);
    setActivePanel("buyer");
  }

  function openSupplier() {
    setFabOpen(false);
    setActivePanel("supplier");
  }

  const springStyle = {
    transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
    transitionDuration: "300ms",
  } as const;

  return (
    <>
      <div
        ref={fabRef}
        className="fixed bottom-6 left-6 z-40 flex flex-col items-start"
      >
        {/* Option cards — fan up above the FAB */}
        <div className="flex flex-col-reverse gap-3 mb-3">
          {/* Buyer card (rendered first = bottom position, delay 0ms) */}
          <button
            type="button"
            onClick={openBuyer}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl min-w-55 text-left text-white transition-all ${
              fabOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-5 pointer-events-none"
            }`}
            style={{ ...springStyle, transitionDelay: "0ms", background: "#E8632A" }}
          >
            <span className="text-xl shrink-0">🛒</span>
            <div>
              <p className="text-sm font-semibold leading-tight">
                I need to source a product
              </p>
              <p className="text-xs text-white/70 mt-0.5 leading-tight">
                Tell us what you need, we find the supplier
              </p>
            </div>
          </button>

          {/* Supplier card (rendered second = top position, delay 80ms) */}
          <button
            type="button"
            onClick={openSupplier}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl min-w-55 text-left text-white transition-all border border-white/10 ${
              fabOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-5 pointer-events-none"
            }`}
            style={{
              ...springStyle,
              transitionDelay: fabOpen ? "80ms" : "0ms",
              background: "#0f1923",
            }}
          >
            <span className="text-xl shrink-0">🏭</span>
            <div>
              <p className="text-sm font-semibold leading-tight">
                I manufacture food products
              </p>
              <p className="text-xs text-white/70 mt-0.5 leading-tight">
                List your products, reach Israeli buyers
              </p>
            </div>
          </button>
        </div>

        {/* FAB button */}
        <button
          type="button"
          onClick={() => setFabOpen((prev) => !prev)}
          className="text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
          style={{
            background: "#E8632A",
            boxShadow: "0 4px 20px rgba(232,99,42,0.35)",
          }}
        >
          <span
            className="inline-block transition-transform duration-200"
            style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            🔍
          </span>
          <span
            className="overflow-hidden transition-all duration-200"
            style={{
              maxWidth: fabOpen ? 0 : 120,
              opacity: fabOpen ? 0 : 1,
              whiteSpace: "nowrap",
            }}
          >
            Find a product
          </span>
        </button>
      </div>

      {activePanel === "buyer" && (
        <BuyerPanel onClose={() => setActivePanel(null)} />
      )}
      {activePanel === "supplier" && (
        <SupplierPanel onClose={() => setActivePanel(null)} />
      )}
    </>
  );
}
