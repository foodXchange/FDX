"use client";

import { useState } from "react";
import TradeDocumentSuiteModal, {
  type TradeDocumentSuiteProps,
} from "@/components/admin/TradeDocumentSuiteModal";

interface Props extends Omit<TradeDocumentSuiteProps, "onClose"> {
  label?: string;
  className?: string;
  defaultTab?: "brief" | "customs" | "po" | "wire_advice" | "ncnda";
  variant?: "primary" | "secondary" | "outline";
}

export default function TradeDocumentSuiteButton({
  label = "📄 Export Trade PDFs",
  className,
  defaultTab = "brief",
  variant = "secondary",
  ...props
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const baseStyles =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer";
  const variantStyles = {
    primary: "bg-orange-600 hover:bg-orange-700 text-white",
    secondary: "bg-slate-900 hover:bg-slate-800 text-white",
    outline: "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}
      >
        <span>{label}</span>
      </button>

      {isOpen && (
        <TradeDocumentSuiteModal
          {...props}
          initialTab={defaultTab}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
