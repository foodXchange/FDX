"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
}

export const PROMPTS: Array<{ category: string; prompt: string }> = [
  {
    category: "Oils & Fats",
    prompt: `Generate image: Premium extra virgin olive oil bottles in 750ml glass on worn marble surface, scattered green olive branches, golden afternoon Mediterranean light, one bottle open with thin stream of oil catching light, blurred stone wall background. Act as a professional photo editing manager for a premium food trade magazine. Style: editorial food photography. Lighting: natural warm Mediterranean golden hour. Color palette: warm gold, deep green, warm stone. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Tomato Products",
    prompt: `Generate image: Italian tomato paste in various formats arranged on rustic wooden surface with fresh vine tomatoes, warm Sicilian summer light, red and orange tones, sauce dripping from open jar. Act as a professional photo editing manager for a premium food trade magazine. Style: editorial food photography. Lighting: warm directional natural light. Color palette: deep reds, warm oranges, green leaf accents. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Canned Foods",
    prompt: `Generate image: Artisan arrangement of premium canned goods - chickpeas, olives, corn, beans - some open showing contents, on slate surface with scattered herbs, clean industrial light. Act as a professional photo editing manager for a premium food trade magazine. Style: editorial commercial photography. Lighting: clean studio soft shadows. Color palette: warm neutrals, pops of color from contents. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Snacks",
    prompt: `Generate image: Scattered premium European snacks - wafers, crackers, biscuits, nuts - styled flat lay on dark slate, some broken showing texture, warm studio lighting. Act as a professional photo editing manager for a premium food trade magazine. Style: editorial lifestyle food photography. Lighting: warm overhead studio. Color palette: warm caramel, cream, dark slate. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Frozen Foods",
    prompt: `Generate image: Premium frozen potato wedges spilling from packaging onto icy surface, frost crystals visible, cold blue-white lighting with warm golden accent. Act as a professional photo editing manager for a premium food trade magazine. Style: commercial food photography. Lighting: cold directional with warm accent. Color palette: icy blues, golden potato tones, clean white. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Bakery",
    prompt: `Generate image: Artisan European bakery products - granola, muesli, cereals - arranged on linen cloth with scattered oats, honey drizzle, golden morning light. Act as a professional photo editing manager for a premium food trade magazine. Style: lifestyle editorial. Lighting: warm morning window light. Color palette: golden, honey, warm cream. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Pasta & Grains",
    prompt: `Generate image: Premium Italian pasta varieties arranged with raw durum wheat grain spilling from hessian sack, flour dust in air, warm Puglia farmhouse light. Act as a professional photo editing manager for a premium food trade magazine. Style: editorial Italian artisan. Lighting: warm diffused natural light. Color palette: golden wheat, warm beige, terracotta. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Sauces & Condiments",
    prompt: `Generate image: Mediterranean condiments - tahini, hummus, harissa - in glass jars and ceramic bowls, fresh herbs scattered, olive oil drizzle, warm afternoon light. Act as a professional photo editing manager for a premium food trade magazine. Style: editorial food photography. Lighting: warm directional natural. Color palette: warm ochre, deep red, cream, fresh green. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Fish & Seafood",
    prompt: `Generate image: Premium canned tuna on fishing dock aesthetic, open cans showing glistening fish in olive oil, coarse salt, lemon slices, Mediterranean light on water background. Act as a professional photo editing manager for a premium food trade magazine. Style: editorial coastal Mediterranean. Lighting: bright Mediterranean midday. Color palette: ocean blue, warm gold, silver. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Organic & Natural",
    prompt: `Generate image: Organic products - granola, dried fruits, seeds - in natural linen bags and glass jars on wooden surface with scattered wildflowers, soft natural light. Act as a professional photo editing manager for a premium food trade magazine. Style: organic lifestyle editorial. Lighting: soft diffused window light. Color palette: earth tones, natural linen, soft greens. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Spices & Herbs",
    prompt: `Generate image: Mediterranean spices in small ceramic bowls - paprika, cumin, turmeric - on dark slate, colorful powders spilling, warm dramatic side lighting. Act as a professional photo editing manager for a premium food trade magazine. Style: dramatic editorial. Lighting: strong warm side light. Color palette: vibrant reds, golds on dark slate. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Beverages",
    prompt: `Generate image: Premium fruit juices in glass bottles with fresh cut fruits, condensation on cold bottles, bright natural light. Act as a professional photo editing manager for a premium food trade magazine. Style: fresh lifestyle editorial. Lighting: bright clean natural. Color palette: vibrant fruit colors, clean whites. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Dairy",
    prompt: `Generate image: European artisan dairy products - cheese, butter - on marble board with walnuts, honey, fresh herbs, warm European deli aesthetic. Act as a professional photo editing manager for a premium food trade magazine. Style: European deli editorial. Lighting: soft warm diffused. Color palette: cream, warm yellow, natural wood. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Pulses & Legumes",
    prompt: `Generate image: Premium dried legumes - chickpeas, lentils, white beans - spilling from hessian sacks onto stone surface, some cooked in ceramic bowl, warm Mediterranean market light. Act as a professional photo editing manager for a premium food trade magazine. Style: market editorial. Lighting: warm Mediterranean market light. Color palette: warm earth tones, terracotta. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Meat & Poultry",
    prompt: `Generate image: Premium kosher meat cuts on butcher block, fresh herbs alongside, professional butcher aesthetic, clean cold lighting with warm wood tones. Act as a professional photo editing manager for a premium food trade magazine. Style: professional butcher editorial. Lighting: clean cold with warm wood accent. Color palette: deep red, clean white, warm wood. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Ingredients & Additives",
    prompt: `Generate image: Premium food ingredients - freeze dried fruits, natural powders - in laboratory-style glass containers on clean white surface, precise and professional. Act as a professional photo editing manager for a premium food trade magazine. Style: clean professional commercial. Lighting: clean overhead studio. Color palette: clinical white, powder colors. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
  {
    category: "Other",
    prompt: `Generate image: Overhead flat lay of diverse premium European food products - jars, cans, bags, bottles - arranged artfully on dark slate, celebrating variety and quality, warm studio lighting. Act as a professional photo editing manager for a premium food trade magazine. Style: abundance editorial flat lay. Lighting: warm overhead studio dramatic. Color palette: rich varied colors on dark slate. No text, no logos, no faces. Format: 16:9 landscape.`,
  },
];

export default function IdeogramModal({ onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyPrompt(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function copyAll() {
    const all = PROMPTS.map(
      (p) => `=== ${p.category} ===\n${p.prompt}`
    ).join("\n\n");
    await copyPrompt("all", all);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Ideogram Prompts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              17 prompts ready to copy — generate in Ideogram, then paste the URL back here
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyAll}
              className="text-xs border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 px-3 py-1.5 rounded-lg transition"
            >
              {copied === "all" ? "✓ Copied all" : "Copy all prompts"}
            </button>
            <a
              href="https://ideogram.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition"
            >
              Open Ideogram ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none ml-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable prompt list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {PROMPTS.map((p) => (
            <div
              key={p.category}
              className="border border-slate-100 rounded-xl p-4 bg-slate-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">
                  {p.category}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyPrompt(p.category, p.prompt)}
                    className="text-xs border border-slate-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600 px-2 py-1 rounded-lg transition"
                  >
                    {copied === p.category ? "✓ Copied" : "Copy prompt"}
                  </button>
                  <a
                    href="https://ideogram.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-orange-600 transition"
                  >
                    Open ↗
                  </a>
                </div>
              </div>
              <pre className="font-mono text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                {p.prompt}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
