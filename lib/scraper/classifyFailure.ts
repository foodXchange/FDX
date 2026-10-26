export type FailureCat =
  | "all"
  | "no_products"
  | "empty_or_blocked"
  | "timeout"
  | "ai_billing"
  | "other";

export function classifyRowFailure(notes: string | null | undefined): {
  cat: Exclude<FailureCat, "all">;
  badge: string;
  detail: string;
  tone: string;
} {
  const raw = (notes ?? "").trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes("prepayment credits") ||
    lower.includes("credit balance is too low") ||
    lower.includes("resource_exhausted") ||
    lower.includes("organization has been disabled") ||
    lower.includes("402") ||
    lower.includes("quota")
  ) {
    return {
      cat: "ai_billing",
      badge: "AI Credit/Quota (402)",
      detail: "Failed during past run when old AI key ran out of credits — ready to re-scrape",
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (lower.includes("no products extracted") || lower.includes("no product urls")) {
    return {
      cat: "no_products",
      badge: "No SKUs on Page",
      detail: raw || "Website loaded, but no individual retail SKUs were extracted",
      tone: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }

  if (lower.includes("timeout") || lower.includes("network error")) {
    return {
      cat: "timeout",
      badge: "Timeout (>90s)",
      detail: raw || "Website server timed out during crawl",
      tone: "bg-orange-50 text-orange-800 border-orange-200",
    };
  }

  if (
    !raw ||
    lower.includes("no content returned") ||
    lower.includes("website blocked") ||
    lower.includes("bot challenge")
  ) {
    return {
      cat: "empty_or_blocked",
      badge: raw.toLowerCase().includes("blocked") ? "Bot/Cloudflare Block" : "Dead / Empty URL",
      detail: raw || "Domain unreachable, SSL expired, or returned empty content",
      tone: "bg-slate-100 text-slate-700 border-slate-300",
    };
  }

  return {
    cat: "other",
    badge: "Crawl Error",
    detail: raw,
    tone: "bg-red-50 text-red-700 border-red-200",
  };
}
