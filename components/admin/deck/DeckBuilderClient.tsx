"use client";

import { useState } from "react";
import type { FactoryItem } from "@/components/deck/AssortmentDeckViewer";

const PRESETS: {
  label: string;
  category: string;
  title: string;
  personal_note: string;
  factories: FactoryItem[];
}[] = [
  {
    label: "🫒 Extra Virgin Olive Oil (Spain & Italy)",
    category: "Oils & Fats",
    title: "European Extra Virgin Olive Oil & Specialty Vinegars Selection",
    personal_note:
      "Pre-screened Italian and Spanish olive oil mills with verified high-polyphenol cold extraction, certified Kosher supervision (Chief Rabbinate import clearance), and competitive CIF Haifa container economics.",
    factories: [
      {
        company_name: "OleoEstepa Cooperative SCA",
        country: "Spain",
        flag: "🇪🇸",
        region: "Seville, Andalusia",
        product_name: "Extra Virgin Olive Oil 750ml Marasca Glass (Private Label)",
        format: "750ml Dark Glass Bottle & 1L PET",
        certifications: ["BRC Grade AA", "IFS Higher Level", "ISO 22000"],
        kosher_type: "Chief Rabbinate of Israel (אישור הרה״ר)",
        indicative_price: "€4.15 / unit CIF Haifa",
        moq: "1 x 20ft FCL (14,400 units)",
        lead_time: "3-4 weeks",
        image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
        specs: [
          "Acidity < 0.3% (Super Premium category)",
          "Cold extracted < 27°C within 12 hours of harvesting",
          "Hebrew nutrition & allergen back-label pre-approved",
        ],
      },
      {
        company_name: "Frantoio Oleario Salernitano SpA",
        country: "Italy",
        flag: "🇮🇹",
        region: "Campania / Salerno",
        product_name: "100% Italian EVOO 1L Tin & Glass Selection",
        format: "1L Tinplate Can & 750ml Bottle",
        certifications: ["IFS Higher Level", "ISO 9001"],
        kosher_type: "Badatz Mehadrin & Chief Rabbinate",
        indicative_price: "€4.45 / unit CIF Haifa",
        moq: "1 x 40ft FCL (18,000 units)",
        lead_time: "4 weeks",
        image_url: "https://images.unsplash.com/photo-1541256942802-7b299655f4bc?w=600&auto=format&fit=crop&q=80",
        specs: [
          "Cultivars: Frantoio, Leccino, Moraiolo blend",
          "High polyphenol count > 350 mg/kg",
          "High-speed automated packaging line (12,000 bph)",
        ],
      },
    ],
  },
  {
    label: "🥫 Canned Pelagic Fish & Tuna Fillets (Spain & Portugal)",
    category: "Canned Foods",
    title: "European Canned Tuna Fillets & Sardines Selection",
    personal_note:
      "Top-tier Atlantic and Mediterranean tuna canneries with dolphin-safe certification, high-drain weight ratio, and established kosher rabbinical inspection history.",
    factories: [
      {
        company_name: "Conservas Rianxeira SA",
        country: "Spain",
        flag: "🇪🇸",
        region: "Galicia",
        product_name: "Yellowfin Tuna Chunks in Olive Oil 185g (Club Pack 3x185g)",
        format: "185g Round Tin (Easy-Open Lid)",
        certifications: ["BRC Grade A", "IFS", "Friend of the Sea"],
        kosher_type: "Chief Rabbinate of Israel (אישור הרה״ר)",
        indicative_price: "€0.88 / unit CIF Haifa",
        moq: "1 x 20ft Container (36,000 tins)",
        lead_time: "4 weeks",
        image_url: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=600&auto=format&fit=crop&q=80",
        specs: [
          "Drained weight &ge; 70% (130g net drained)",
          "100% Skipjack / Yellowfin solid pack without soya filler",
          "Hebrew lithographed can body or paper wrap-around",
        ],
      },
      {
        company_name: "Fabrica de Conservas La Gondola Lda",
        country: "Portugal",
        flag: "🇵🇹",
        region: "Matosinhos",
        product_name: "Gourmet Spiced Sardines in Extra Virgin Olive Oil 125g",
        format: "125g Dingley Flat Tin",
        certifications: ["IFS Higher Level", "ISO 22000"],
        kosher_type: "Chief Rabbinate (Kosher Fish)",
        indicative_price: "€0.79 / unit CIF Ashdod",
        moq: "1 x 20ft FCL",
        lead_time: "3-4 weeks",
        image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80",
        specs: [
          "Traditional pre-cooked steaming process",
          "Fish count: 3-5 premium selected sardines per can",
          "Non-BPA internal lacquer lining",
        ],
      },
    ],
  },
  {
    label: "🍟 Frozen French Fries & Potato Wedges (Belgium)",
    category: "Frozen Foods",
    title: "Belgian IQF Frozen French Fries & Seasoned Potato Wedges",
    personal_note:
      "Belgium’s premier potato processing plants offering A-grade Golden French Fries (9x9mm & 6x6mm Shoestring) with low fat absorption and high yield for retail and HoReCa.",
    factories: [
      {
        company_name: "Agristo NV",
        country: "Belgium",
        flag: "🇧🇪",
        region: "Harelbeke, West Flanders",
        product_name: "IQF Frozen French Fries 9x9mm 1kg Retail Pillow Pack",
        format: "1kg Polybag (10x1kg master carton)",
        certifications: ["BRC Grade AA+", "IFS Higher Level"],
        kosher_type: "Badatz Mehadrin & Chief Rabbinate",
        indicative_price: "€0.72 / kg CIF Haifa (Reefer FCL)",
        moq: "1 x 40ft Reefer Container (24 Metric Tons)",
        lead_time: "2-3 weeks",
        image_url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80",
        specs: [
          "Potato variety: Innovator / Fontana (High dry matter &ge; 21%)",
          "Par-fried in 100% RSPO segregated sustainable palm/sunflower",
          "Crispness duration > 18 minutes post-fryer",
        ],
      },
    ],
  },
];

const RETAILERS = [
  "Shufersal Ltd (שופרסל)",
  "Victory Supermarkets (ויקטורי)",
  "Yohananof (יוחננוף)",
  "Osher Ad (אושר עד)",
  "Rami Levy Shivuk Hashikma (רמי לוי)",
  "Bareket Markets (סופר ברקת)",
  "Tiv Taam (טיב טעם)",
  "Mega / Yeinot Bitan (קרפור / יינות ביתן)",
];

export function DeckBuilderClient() {
  const [title, setTitle] = useState(PRESETS[0].title);
  const [category, setCategory] = useState(PRESETS[0].category);
  const [buyerName, setBuyerName] = useState("Private Label Sourcing Team");
  const [buyerCompany, setBuyerCompany] = useState(RETAILERS[0]);
  const [personalNote, setPersonalNote] = useState(PRESETS[0].personal_note);
  const [factories, setFactories] = useState<FactoryItem[]>(PRESETS[0].factories);

  const [generating, setGenerating] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<{
    token: string;
    deckUrl: string;
    pdfUrl: string;
  } | null>(null);

  function applyPreset(p: (typeof PRESETS)[0]) {
    setTitle(p.title);
    setCategory(p.category);
    setPersonalNote(p.personal_note);
    setFactories(p.factories);
  }

  function updateFactory(index: number, patch: Partial<FactoryItem>) {
    setFactories((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  }

  function addEmptyFactory() {
    setFactories((prev) => [
      ...prev,
      {
        company_name: "European Manufacturer SpA",
        country: "Italy",
        flag: "🇮🇹",
        region: "Modena",
        product_name: "Product Description & Spec",
        format: "Standard Retail Packaging",
        certifications: ["BRC Grade A", "IFS"],
        kosher_type: "Chief Rabbinate of Israel",
        indicative_price: "€1.20 / unit CIF Haifa",
        moq: "1 x 20ft Container",
        lead_time: "4 weeks",
        image_url: "",
        specs: ["Specification detail 1", "Specification detail 2"],
      },
    ]);
  }

  function removeFactory(index: number) {
    if (factories.length <= 1) {
      alert("At least 1 factory is required in the assortment deck.");
      return;
    }
    setFactories((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/deck/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          buyer_name: buyerName.trim(),
          buyer_company: buyerCompany.trim(),
          category: category.trim(),
          personal_note: personalNote.trim(),
          factories,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setGeneratedDeck(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error generating assortment deck");
    } finally {
      setGenerating(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://fdx.trading";
  const shareableFullUrl = generatedDeck ? `${origin}${generatedDeck.deckUrl}` : "";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>📑</span>
            <span>B2B Assortment Deck Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate executive manufacturer selection decks (Vector PDF &amp; Interactive Web Link) for Israeli retail category managers.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1">Load Preset:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              {p.label.split(" ")[0]} {p.category}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Step 1: Presentation & Target Retailer */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#F47920]">
            1. Target Retailer &amp; Deck Header
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Presentation Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#F47920]"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Category *</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#F47920]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Target Retail Chain / Importer *
              </label>
              <input
                type="text"
                required
                value={buyerCompany}
                onChange={(e) => setBuyerCompany(e.target.value)}
                placeholder="e.g. Shufersal Ltd"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#F47920]"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {RETAILERS.slice(0, 4).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBuyerCompany(r)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    + {r.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Buyer Contact / Recipient Name *
              </label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Category Manager - Dry Goods"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#F47920]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold text-xs">
              Personal Intro Note from Udi (Appears on Cover &amp; Web Deck)
            </label>
            <textarea
              rows={2}
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-[#F47920] resize-none"
            />
          </div>
        </div>

        {/* Step 2: European Factories Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#F47920]">
              2. Candidate European Factories ({factories.length})
            </h2>
            <button
              type="button"
              onClick={addEmptyFactory}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 border border-orange-500/30 transition-colors"
            >
              + Add Another Factory
            </button>
          </div>

          <div className="space-y-4">
            {factories.map((f, i) => (
              <div
                key={i}
                className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-[#F47920] flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </span>
                    <span className="font-bold text-white text-sm">{f.company_name}</span>
                    <span className="text-xs text-slate-400">
                      {f.flag} {f.country}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFactory(i)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Factory Name *</label>
                    <input
                      type="text"
                      required
                      value={f.company_name}
                      onChange={(e) => updateFactory(i, { company_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Country &amp; Flag *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={f.flag}
                        onChange={(e) => updateFactory(i, { flag: e.target.value })}
                        className="w-12 text-center bg-slate-900 border border-slate-700 rounded-xl text-white"
                      />
                      <input
                        type="text"
                        value={f.country}
                        onChange={(e) => updateFactory(i, { country: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Region / City</label>
                    <input
                      type="text"
                      value={f.region || ""}
                      onChange={(e) => updateFactory(i, { region: e.target.value })}
                      placeholder="e.g. Seville, Andalusia"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Product Name &amp; Spec *</label>
                    <input
                      type="text"
                      required
                      value={f.product_name}
                      onChange={(e) => updateFactory(i, { product_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Packaging Format</label>
                    <input
                      type="text"
                      value={f.format || ""}
                      onChange={(e) => updateFactory(i, { format: e.target.value })}
                      placeholder="e.g. 750ml Marasca Bottle (12/case)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Target CIF Price</label>
                    <input
                      type="text"
                      value={f.indicative_price || ""}
                      onChange={(e) => updateFactory(i, { indicative_price: e.target.value })}
                      placeholder="€4.15 / unit CIF Haifa"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">MOQ</label>
                    <input
                      type="text"
                      value={f.moq || ""}
                      onChange={(e) => updateFactory(i, { moq: e.target.value })}
                      placeholder="1 x 20ft Container"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Lead Time</label>
                    <input
                      type="text"
                      value={f.lead_time || ""}
                      onChange={(e) => updateFactory(i, { lead_time: e.target.value })}
                      placeholder="3-4 weeks"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Kosher Feasibility</label>
                    <input
                      type="text"
                      value={f.kosher_type}
                      onChange={(e) => updateFactory(i, { kosher_type: e.target.value })}
                      placeholder="Chief Rabbinate / Badatz"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-amber-300 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Certifications (comma separated)
                    </label>
                    <input
                      type="text"
                      value={f.certifications.join(", ")}
                      onChange={(e) =>
                        updateFactory(i, {
                          certifications: e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
                        })
                      }
                      placeholder="BRC Grade A, IFS Higher Level, ISO 22000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Packshot / Plant Image URL</label>
                    <input
                      type="url"
                      value={f.image_url || ""}
                      onChange={(e) => updateFactory(i, { image_url: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={generating}
            className="w-full bg-[#F47920] hover:bg-[#d96810] text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Presentation &amp; Vector PDF...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Generate B2B Assortment Deck (PDF &amp; Shareable Web Link)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Generated Modal ── */}
      {generatedDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-white">Assortment Deck Ready!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The deck for <strong className="text-white">{buyerCompany}</strong> has been generated and published.
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-2 text-xs">
              <span className="text-slate-400 font-semibold block">Shareable Secret Web Deck:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareableFullUrl}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-orange-400 font-mono text-[11px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableFullUrl);
                    alert("Copied deck link to clipboard!");
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <a
                href={generatedDeck.deckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-sky-600/20"
              >
                <span>👁️</span>
                <span>Open Web Deck</span>
              </a>

              <a
                href={generatedDeck.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#F47920] hover:bg-[#d96810] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-orange-500/20"
              >
                <span>📥</span>
                <span>Download Vector PDF</span>
              </a>
            </div>

            <div className="pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hi ${buyerName}, here is the European Assortment Deck prepared for ${buyerCompany}: ${shareableFullUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#1DA851] hover:bg-[#189a47] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>💬</span>
                <span>Share Link on WhatsApp</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setGeneratedDeck(null)}
              className="w-full py-2 text-slate-400 hover:text-white text-xs transition-colors"
            >
              Done &middot; Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
