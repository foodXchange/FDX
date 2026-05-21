'use client';
import { useState } from "react";

interface CopyEmailProps {
  email: string;
  className?: string;
}

export default function CopyEmail({ email, className }: CopyEmailProps) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = email;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <a
        href={`mailto:${email}`}
        className="text-orange-600 hover:underline font-medium"
      >
        {email}
      </a>

      <button
        onClick={copyEmail}
        aria-label={copied ? "Copied!" : "Copy email address"}
        title={copied ? "Copied!" : "Copy email address"}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M8 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1h1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            Copy
          </>
        )}
      </button>
    </span>
  );
}
