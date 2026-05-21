'use client';
import { useEffect } from "react";

interface Props {
  slug: string;
}

export default function PortfolioClickTracker({ slug }: Props) {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fx_last_match_slugs");
      if (!raw) return;
      const slugs: string[] = JSON.parse(raw);
      if (!Array.isArray(slugs) || !slugs.includes(slug)) return;
      sessionStorage.removeItem("fx_last_match_slugs");
      fetch("/api/events/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "match_clicked",
          clicked_slug: slug,
          page_path: window.location.pathname,
          session_id: localStorage.getItem("fx_session_id"),
        }),
      }).catch(() => {});
    } catch {
      // ignore storage/parse errors
    }
  }, [slug]);
  return null;
}
