"use client";

import { useEffect } from "react";

interface Props {
  token: string;
}

export default function ProposalTracker({ token }: Props) {
  useEffect(() => {
    fetch("/api/proposals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, event_type: "page_view" }),
    }).catch(() => {});
  }, [token]);

  return null;
}
