"use client";
import { useState } from "react";

interface Props {
  text: string;
  label?: string;
  className?: string;
  onCopied?: () => void;
}

export function CopyButton({ text, label = "Copy", className = "", onCopied }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / HTTP contexts
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className={`text-xs font-semibold transition-colors ${
        copied ? "text-green-400" : "text-slate-400 hover:text-slate-200"
      } ${className}`}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
