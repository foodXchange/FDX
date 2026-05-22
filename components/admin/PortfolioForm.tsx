'use client';
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import ArrayInput from "@/components/admin/ArrayInput";
import ImageUpload from "@/components/admin/ImageUpload";
import { suggestPortfolioTaxonomy } from "@/app/admin/portfolio/suggestActions";
import type { PortfolioInput } from "@/app/admin/portfolio/actions";
import PortfolioAIAssistant from "@/components/admin/PortfolioAIAssistant";

type ActionResult = { ok: boolean; id?: string; error?: string };
type Action = (data: PortfolioInput) => Promise<ActionResult>;

interface Props {
  action: Action;
  initialData?: Partial<PortfolioInput> & { id?: string };
  redirectOnCreate?: string;
}

const CATEGORY_SUGGESTIONS = [
  "Dairy & Cheese",
  "Meat & Poultry",
  "Bakery & Bread",
  "Snacks & Confectionery",
  "Beverages",
  "Oils & Fats",
  "Frozen Foods",
  "Organic & Natural",
  "Private Label",
  "Seafood",
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function InlineTooltip({ content }: { content: string }) {
  return (
    <span className="relative group inline-block">
      <span className="text-slate-300 text-xs cursor-help">ⓘ</span>
      <span className="absolute left-5 top-0 z-20 hidden group-hover:block w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg leading-relaxed pointer-events-none">
        {content}
      </span>
    </span>
  );
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function buildContent(s: {
  brief: string;
  challenge: string;
  validated: string;
  findings: string;
  takeaways: string;
}): string {
  return [
    `<section class="scenario-brief"><h2>The sourcing brief</h2>${s.brief}</section>`,
    `<section class="scenario-challenge"><h2>The market challenge</h2>${s.challenge}</section>`,
    `<section class="scenario-validated"><h2>What we validated</h2>${s.validated}</section>`,
    `<section class="scenario-findings"><h2>What we found</h2>${s.findings}</section>`,
    `<section class="scenario-takeaways"><h2>Key takeaways</h2>${s.takeaways}</section>`,
  ].join("\n");
}

function extractSections(html: string) {
  const extract = (name: string) => {
    const m = html.match(
      new RegExp(`<section class="scenario-${name}">[\\s\\S]*?</h2>([\\s\\S]*?)</section>`)
    );
    return m ? m[1].trim() : "";
  };
  return {
    brief: extract("brief"),
    challenge: extract("challenge"),
    validated: extract("validated"),
    findings: extract("findings"),
    takeaways: extract("takeaways"),
  };
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-orange-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <span className="text-sm text-gray-700 font-medium">{label}</span>
    </label>
  );
}

export default function PortfolioForm({ action, initialData, redirectOnCreate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(!!initialData?.slug);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [summary, setSummary] = useState(initialData?.summary ?? "");
  const existingSections = initialData?.content ? extractSections(initialData.content) : null;
  const [brief, setBrief] = useState(existingSections?.brief ?? "");
  const [challenge, setChallenge] = useState(existingSections?.challenge ?? "");
  const [validated, setValidated] = useState(existingSections?.validated ?? "");
  const [findings, setFindings] = useState(existingSections?.findings ?? "");
  const [takeaways, setTakeaways] = useState(existingSections?.takeaways ?? "");
  const [aiStreaming, setAiStreaming] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<Record<string, string>>({});
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImagePrompt, setGeneratingImagePrompt] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [heroImage, setHeroImage] = useState(initialData?.hero_image ?? "");
  const [priority, setPriority] = useState(initialData?.priority ?? 0);
  const [published, setPublished] = useState(initialData?.published ?? false);
  const [privateLabel, setPrivateLabel] = useState(initialData?.private_label ?? false);
  const [markets, setMarkets] = useState<string[]>(initialData?.markets ?? []);
  const [formats, setFormats] = useState<string[]>(initialData?.formats ?? []);
  const [certifications, setCertifications] = useState<string[]>(
    initialData?.certifications ?? []
  );
  const [countries, setCountries] = useState<string[]>(initialData?.countries ?? []);
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [highlightingField, setHighlightingField] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    tags: string[];
    formats: string[];
    certifications: string[];
    market: string | null;
    privateLabel: boolean | null;
  } | null>(null);

  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugEdited]);

  function handleSlugChange(v: string) {
    setSlugEdited(true);
    setSlug(v);
  }

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestions(null);
    try {
      const result = await suggestPortfolioTaxonomy({
        title,
        summary,
        content: buildContent({ brief, challenge, validated, findings, takeaways }),
      });
      if (result.ok) setSuggestions(result);
    } finally {
      setSuggesting(false);
    }
  }

  async function generateSectionAI(sectionName: string) {
    setAiStreaming(sectionName);
    setAiDraft((prev) => ({ ...prev, [sectionName]: "" }));
    try {
      const res = await fetch("/api/admin/portfolio/ai-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionName, title, category, tags, markets, formats }),
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiDraft((prev) => ({
          ...prev,
          [sectionName]: (prev[sectionName] ?? "") + decoder.decode(value, { stream: true }),
        }));
      }
    } finally {
      setAiStreaming(null);
    }
  }

  async function generateImagePrompt() {
    setGeneratingImagePrompt(true);
    setImagePrompt("");
    try {
      const res = await fetch("/api/admin/portfolio/ai-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionName: "image-prompt",
          title,
          category,
          tags,
          markets,
          formats,
        }),
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setImagePrompt((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } finally {
      setGeneratingImagePrompt(false);
    }
  }

  async function copyImagePrompt() {
    await navigator.clipboard.writeText(imagePrompt);
    setImageCopied(true);
    setTimeout(() => setImageCopied(false), 2000);
  }

  function applyTag(value: string, field: "tags" | "formats" | "certifications") {
    if (field === "tags") setTags((prev) => Array.from(new Set([...prev, value])));
    else if (field === "formats") setFormats((prev) => Array.from(new Set([...prev, value])));
    else setCertifications((prev) => Array.from(new Set([...prev, value])));
  }

  function applyAll() {
    if (!suggestions) return;
    setTags((prev) => Array.from(new Set([...prev, ...suggestions.tags])));
    setFormats((prev) => Array.from(new Set([...prev, ...suggestions.formats])));
    setCertifications((prev) => Array.from(new Set([...prev, ...suggestions.certifications])));
    if (suggestions.market && !category) setCategory(suggestions.market);
    if (suggestions.privateLabel !== null) setPrivateLabel(suggestions.privateLabel);
    setSuggestions(null);
  }

  function handleSave() {
    setError("");
    const data: PortfolioInput = {
      title,
      slug,
      category,
      summary,
      content: buildContent({ brief, challenge, validated, findings, takeaways }),
      hero_image: heroImage,
      priority,
      published,
      private_label: privateLabel,
      markets,
      formats,
      certifications,
      countries,
      tags,
    };

    startTransition(async () => {
      const result = await action(data);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      if (redirectOnCreate && result.id) {
        router.push(`/admin/portfolio/${result.id}`);
      } else if (redirectOnCreate) {
        router.push(redirectOnCreate);
      }
    });
  }

  const canGenerateImagePrompt =
    Boolean(title) &&
    Boolean(category) &&
    Boolean(brief) &&
    (markets.length > 0 || formats.length > 0);

  const inputCls =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
  const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";
  const cardCls = "bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm";

  const SECTIONS = [
    {
      key: "brief" as const,
      label: "The sourcing brief",
      value: brief,
      setter: setBrief,
      placeholder:
        "Describe what was needed — product type, format, volume range, target market. Do not mention the buyer by name.",
      tooltip:
        "What did the buyer need? Describe the product and market without naming the client.",
    },
    {
      key: "challenge" as const,
      label: "The market challenge",
      value: challenge,
      setter: setChallenge,
      placeholder:
        "What made this category complex? What do most importers get wrong? What is the real risk buyers face in this category?",
      tooltip:
        "What is genuinely difficult about sourcing this product? Show your expertise.",
    },
    {
      key: "validated" as const,
      label: "What we validated",
      value: validated,
      setter: setValidated,
      placeholder:
        "List what was tested and verified: packaging integrity, shelf life, certifications, production capacity, labeling compliance, etc.",
      tooltip:
        "Be specific. Specs, tests, certifications checked. This shows the depth of your work.",
    },
    {
      key: "findings" as const,
      label: "What we found",
      value: findings,
      setter: setFindings,
      placeholder:
        "Describe the supplier landscape — without naming specific suppliers. Which countries perform best? What are the common gaps? What surprised you?",
      tooltip:
        "Market intelligence — not supplier names. Describe patterns, not individuals.",
    },
    {
      key: "takeaways" as const,
      label: "Key takeaways for buyers",
      value: takeaways,
      setter: setTakeaways,
      placeholder:
        "• First key insight for buyers in this category\n• Second key insight\n• Third key insight",
      tooltip:
        "3-5 bullet points a buyer should know before sourcing this product.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* AI ASSISTANT */}
      <PortfolioAIAssistant
        setTitle={setTitle}
        setSlug={setSlug}
        setSlugEdited={setSlugEdited}
        setCategory={setCategory}
        setSummary={setSummary}
        setBrief={setBrief}
        setChallenge={setChallenge}
        setValidated={setValidated}
        setFindings={setFindings}
        setTakeaways={setTakeaways}
        setPriority={setPriority}
        setPrivateLabel={setPrivateLabel}
        setMarkets={setMarkets}
        setFormats={setFormats}
        setCertifications={setCertifications}
        setCountries={setCountries}
        setTags={setTags}
        setHighlightingField={setHighlightingField}
        title={title}
        category={category}
      />

      {/* TITLE */}
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item title…"
          className={`w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-orange-400 bg-transparent placeholder:text-gray-300 transition-all ${highlightingField === "title" ? "border-orange-400" : ""}`}
        />
      </div>

      {/* SLUG */}
      <div className={cardCls}>
        <label className={labelCls}>Slug</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">/en/portfolio/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="auto-generated"
            className={`${inputCls} transition-all ${highlightingField === "slug" ? "ring-2 ring-orange-400 border-orange-400" : ""}`}
          />
        </div>
      </div>

      {/* CATEGORY */}
      <div className={cardCls}>
        <label className={labelCls}>Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list="category-suggestions"
          placeholder="e.g. Dairy & Cheese"
          className={`${inputCls} transition-all ${highlightingField === "category" ? "ring-2 ring-orange-400 border-orange-400" : ""}`}
        />
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {/* SUMMARY */}
      <div className={cardCls}>
        <label className={labelCls}>Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Short description shown on the portfolio grid…"
          className={`${inputCls} resize-none transition-all ${highlightingField === "summary" ? "ring-2 ring-orange-400 border-orange-400" : ""}`}
        />
      </div>

      {/* CONTENT SECTIONS */}
      <div className={cardCls}>
        <p className={`${labelCls} mb-5`}>Content sections</p>
        {SECTIONS.map((section) => (
          <div key={section.key} className="mb-6 last:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <label className={labelCls}>{section.label}</label>
              <InlineTooltip content={section.tooltip} />
              <button
                type="button"
                onClick={() => generateSectionAI(section.key)}
                disabled={aiStreaming !== null}
                className="ml-auto text-xs px-2 py-0.5 rounded border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-40 transition"
              >
                {aiStreaming === section.key ? "Writing…" : "✦ AI"}
              </button>
            </div>
            <textarea
              value={section.value}
              onChange={(e) => section.setter(e.target.value)}
              placeholder={section.placeholder}
              rows={4}
              className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all ${highlightingField === section.key ? "ring-2 ring-orange-400 border-orange-400" : ""}`}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-400">{wordCount(section.value)} words</p>
              {aiDraft[section.key] && (
                <button
                  type="button"
                  onClick={() => {
                    section.setter(aiDraft[section.key]);
                    setAiDraft((p) => {
                      const n = { ...p };
                      delete n[section.key];
                      return n;
                    });
                  }}
                  className="text-xs text-orange-600 hover:underline"
                >
                  Apply AI draft
                </button>
              )}
            </div>
            {aiDraft[section.key] && (
              <div className="mt-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {aiDraft[section.key]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* IMAGE PROMPT */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className={labelCls}>Image prompt generator</label>
            {!canGenerateImagePrompt && (
              <p className="text-xs text-slate-400 mt-0.5">
                Fill in title, category, sourcing brief, and at least one market or format to unlock.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={generateImagePrompt}
            disabled={!canGenerateImagePrompt || generatingImagePrompt}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
          >
            {generatingImagePrompt ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              "✦ Generate prompt"
            )}
          </button>
        </div>

        {(imagePrompt || generatingImagePrompt) && (
          <div className="relative">
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={4}
              placeholder="Image prompt will appear here…"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-20 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
            />
            {imagePrompt && (
              <button
                type="button"
                onClick={copyImagePrompt}
                className="absolute top-2.5 right-2.5 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                {imageCopied ? "✓ Copied" : "Copy"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* HERO IMAGE */}
      <div className={cardCls}>
        <label className={labelCls}>Hero image</label>
        <ImageUpload
          value={heroImage || null}
          onChange={setHeroImage}
          bucket="portfolio"
          folder="hero"
        />
        <p className="text-xs text-slate-400 mt-2">
          Or paste a URL directly:{" "}
          <input
            type="text"
            className="ml-2 text-xs border-b border-slate-200 focus:outline-none"
            value={heroImage}
            onChange={(e) => setHeroImage(e.target.value)}
            placeholder="https://..."
          />
        </p>
      </div>

      {/* PRIORITY + TOGGLES */}
      <div className={cardCls}>
        <div className="flex flex-wrap gap-6 items-start">
          <div className="flex-1 min-w-[120px]">
            <label className={labelCls}>Priority (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={`${inputCls} w-24 transition-all ${highlightingField === "priority" ? "ring-2 ring-orange-400 border-orange-400" : ""}`}
            />
          </div>
          <div className="flex flex-col gap-3 pt-5">
            <Toggle checked={published} onChange={setPublished} label="Published" />
            <div className={`rounded-lg transition-all ${highlightingField === "private_label" ? "ring-2 ring-orange-400" : ""}`}>
              <Toggle checked={privateLabel} onChange={setPrivateLabel} label="Private label" />
            </div>
          </div>
        </div>
      </div>

      {/* ARRAY FIELDS */}
      <div className={cardCls}>
        <div className="space-y-5">
          <div className={`rounded-lg transition-all ${highlightingField === "markets" ? "ring-2 ring-orange-400" : ""}`}>
            <ArrayInput values={markets} onChange={setMarkets} label="Markets" placeholder="e.g. israel, germany" />
          </div>
          <div className={`rounded-lg transition-all ${highlightingField === "formats" ? "ring-2 ring-orange-400" : ""}`}>
            <ArrayInput values={formats} onChange={setFormats} label="Formats" placeholder="e.g. bulk, retail-pack" />
          </div>
          <div className={`rounded-lg transition-all ${highlightingField === "certifications" ? "ring-2 ring-orange-400" : ""}`}>
            <ArrayInput values={certifications} onChange={setCertifications} label="Certifications" placeholder="e.g. kosher, organic, ifs" />
          </div>
          <div className={`rounded-lg transition-all ${highlightingField === "countries" ? "ring-2 ring-orange-400" : ""}`}>
            <ArrayInput values={countries} onChange={setCountries} label="Countries" placeholder="e.g. belgium, netherlands" />
          </div>
          <div className={`rounded-lg transition-all ${highlightingField === "tags" ? "ring-2 ring-orange-400" : ""}`}>
            <ArrayInput values={tags} onChange={setTags} label="Tags" placeholder="e.g. frozen, private-label" />
          </div>
        </div>
      </div>

      {/* SAVE */}
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSave}
          disabled={pending || !title || !slug}
          className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting || !title}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition"
        >
          {suggesting ? "Analyzing…" : "✦ Suggest tags"}
        </button>
        <a
          href="/admin/portfolio"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Cancel
        </a>
      </div>

      {/* SUGGESTION PANEL */}
      {suggestions && (
        <div className="border border-orange-100 bg-orange-50 rounded-xl p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-700">Suggested from content</p>
            <button
              type="button"
              onClick={() => setSuggestions(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Dismiss
            </button>
          </div>

          {suggestions.tags.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Tags</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.tags.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyTag(item, "tags")}
                    className="bg-white border border-orange-200 rounded-full px-3 py-1 text-xs text-orange-700 hover:bg-orange-100 transition"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.formats.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Formats</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.formats.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyTag(item, "formats")}
                    className="bg-white border border-orange-200 rounded-full px-3 py-1 text-xs text-orange-700 hover:bg-orange-100 transition"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.certifications.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.certifications.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyTag(item, "certifications")}
                    className="bg-white border border-orange-200 rounded-full px-3 py-1 text-xs text-orange-700 hover:bg-orange-100 transition"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.market && (
            <div className="mb-3 flex items-center gap-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Market</p>
              <span className="text-xs text-orange-700">{suggestions.market}</span>
              <button
                type="button"
                onClick={() => { if (suggestions.market) setCategory(suggestions.market); }}
                className="text-xs border border-orange-200 bg-white rounded-full px-3 py-1 text-orange-700 hover:bg-orange-100 transition"
              >
                Apply
              </button>
            </div>
          )}

          {suggestions.privateLabel !== null && (
            <div className="mb-3 flex items-center gap-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Private label</p>
              <span className="text-xs text-orange-700">{suggestions.privateLabel ? "Yes" : "No"}</span>
              <button
                type="button"
                onClick={() => { if (suggestions.privateLabel !== null) setPrivateLabel(suggestions.privateLabel); }}
                className="text-xs border border-orange-200 bg-white rounded-full px-3 py-1 text-orange-700 hover:bg-orange-100 transition"
              >
                Apply
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={applyAll}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium w-full transition"
          >
            Apply all suggestions
          </button>
        </div>
      )}
    </div>
  );
}
