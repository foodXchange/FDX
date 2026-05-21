"use client";

import { useState } from "react";
import ScriptGenerator from "@/components/admin/ScriptGenerator";

type TopicCard = {
  topic: string;
  subtitle?: string;
  audience: "buyers" | "manufacturers" | "general";
};

const BUYER_TOPICS: TopicCard[] = [
  {
    topic: "מה קורה עם מחירי שמן הזית בספרד החודש",
    subtitle: "What is happening with olive oil prices in Spain this month",
    audience: "buyers",
  },
  {
    topic: "3 מוצרים שהשוק הישראלי לא מכיר עדיין",
    subtitle: "3 products the Israeli market does not know yet",
    audience: "buyers",
  },
  {
    topic: "למה האיטלקים מייצרים את הטונה הטובה ביותר",
    subtitle: "Why Italians make the best tuna",
    audience: "buyers",
  },
  {
    topic: "מה הסופרמרקטים האירופאים מוכרים שאנחנו לא",
    subtitle: "What European supermarkets sell that we do not",
    audience: "buyers",
  },
  {
    topic: "כיצד לבחור ספק לייבל פרטי - 5 דברים שחייבים לבדוק",
    subtitle: "How to choose a private label supplier",
    audience: "buyers",
  },
  {
    topic: "כשר - מה ההבדל בין הרבנות לבד\"צ ואיך זה משפיע על הייבוא",
    subtitle: "Kosher — Chief Rabbinate vs Badatz for importers",
    audience: "buyers",
  },
  {
    topic: "טעויות נפוצות ביבוא מאירופה",
    subtitle: "Common mistakes when importing from Europe",
    audience: "buyers",
  },
  {
    topic: "שמן זית מספרד לעומת איטליה — מה ההבדל האמיתי",
    subtitle: "Spanish olive oil vs Italian — the real difference",
    audience: "buyers",
  },
  {
    topic: "עגבניות מרוסקות — למה האיטלקיות שוות יותר",
    subtitle: "Crushed tomatoes — why Italian is worth more",
    audience: "buyers",
  },
  {
    topic: "טונה בשמן זית לעומת מים — מה הקונה מעדיף",
    subtitle: "Tuna in olive oil vs water — what buyers prefer",
    audience: "buyers",
  },
];

const MANUFACTURER_TOPICS: TopicCard[] = [
  {
    topic: "The Israeli food market in 2026 — what you need to know",
    audience: "manufacturers",
  },
  {
    topic: "Why kosher certification is your gateway to Israel",
    audience: "manufacturers",
  },
  {
    topic: "Chief Rabbinate vs Badatz — which kosher do you need",
    audience: "manufacturers",
  },
  {
    topic: "How Israeli retail buyers actually make sourcing decisions",
    audience: "manufacturers",
  },
  {
    topic: "The 3 certifications Israeli buyers ask for every time",
    audience: "manufacturers",
  },
  {
    topic: "Private label in Israel — is it worth it for European manufacturers",
    audience: "manufacturers",
  },
  {
    topic: "What format sizes sell in Israeli retail",
    audience: "manufacturers",
  },
  {
    topic: "Olive oil in Israel — which varieties Israeli consumers prefer",
    audience: "manufacturers",
  },
  {
    topic: "Why Italian tomato products dominate Israeli foodservice",
    audience: "manufacturers",
  },
  {
    topic: "How I find the right Israeli buyer for your product",
    audience: "manufacturers",
  },
  {
    topic: "What happens after you submit your product range to FoodXchange",
    audience: "manufacturers",
  },
  {
    topic: "From first contact to first container — the timeline",
    audience: "manufacturers",
  },
];

const GENERAL_TOPICS: TopicCard[] = [
  {
    topic: "FoodXchange — who we are and what we do",
    audience: "general",
  },
  {
    topic: "The Israeli food import market — size and opportunity in 2026",
    audience: "general",
  },
  {
    topic: "Mediterranean food trends coming to Israel this year",
    audience: "general",
  },
  {
    topic: "Sustainability in food sourcing — what Israeli buyers want now",
    audience: "general",
  },
];

function AudienceBadge({ audience }: { audience: TopicCard["audience"] }) {
  if (audience === "buyers")
    return (
      <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">
        🛒 Buyers
      </span>
    );
  if (audience === "manufacturers")
    return (
      <span className="inline-block bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">
        🏭 Manufacturers
      </span>
    );
  return (
    <span className="inline-block bg-slate-50 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">
      👥 General
    </span>
  );
}

function TopicGrid({
  topics,
  onSelect,
}: {
  topics: TopicCard[];
  onSelect: (topic: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {topics.map((card, i) => (
        <div
          key={i}
          className="border border-slate-200 rounded-xl p-5 hover:border-orange-300 transition bg-white"
        >
          <AudienceBadge audience={card.audience} />
          <p className="font-medium text-slate-900 text-sm leading-snug mb-1">
            {card.topic}
          </p>
          {card.subtitle && (
            <p className="text-xs text-slate-400 italic mb-3">{card.subtitle}</p>
          )}
          <button
            type="button"
            onClick={() => onSelect(card.topic)}
            className="text-orange-600 text-sm font-medium hover:text-orange-700 transition"
          >
            Generate script →
          </button>
        </div>
      ))}
    </div>
  );
}

export default function AdminScriptsPage() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">Video Scripts</span>
        <button
          type="button"
          onClick={() => setActiveTopic("")}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          🎬 Open blank generator
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-7xl mx-auto space-y-10">
        {/* Buyers */}
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            For Buyers
            <span className="ml-2 text-xs font-normal text-slate-400">Hebrew · Instagram · WhatsApp</span>
          </h2>
          <TopicGrid topics={BUYER_TOPICS} onSelect={setActiveTopic} />
        </section>

        {/* Manufacturers */}
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            For Manufacturers
            <span className="ml-2 text-xs font-normal text-slate-400">English · LinkedIn · YouTube</span>
          </h2>
          <TopicGrid topics={MANUFACTURER_TOPICS} onSelect={setActiveTopic} />
        </section>

        {/* General */}
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-1">General</h2>
          <TopicGrid topics={GENERAL_TOPICS} onSelect={setActiveTopic} />
        </section>
      </div>

      {/* Controlled ScriptGenerator */}
      <ScriptGenerator
        open={activeTopic !== null}
        onClose={() => setActiveTopic(null)}
        defaultTopic={activeTopic ?? ""}
      />
    </main>
  );
}
