"use client";

import { useState } from "react";

export default function WasThisHelpful() {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);

  if (choice) {
    return (
      <div className="border border-slate-700 rounded-xl px-5 py-4 text-sm text-slate-300">
        {choice === "yes"
          ? "Thanks for the feedback!"
          : "Thanks — if you'd like, let us know what was missing via the contact page."}
      </div>
    );
  }

  return (
    <div className="border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap">
      <p className="text-sm text-slate-300 font-medium">Was this article helpful?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setChoice("yes")}
          className="border border-slate-600 hover:border-orange-500 hover:text-orange-400 text-slate-300 rounded-lg px-4 py-1.5 text-sm transition"
        >
          Yes
        </button>
        <button
          onClick={() => setChoice("no")}
          className="border border-slate-600 hover:border-orange-500 hover:text-orange-400 text-slate-300 rounded-lg px-4 py-1.5 text-sm transition"
        >
          No
        </button>
      </div>
    </div>
  );
}
