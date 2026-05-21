'use client';
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import ArrayInput from "@/components/admin/ArrayInput";
import ImageUpload from "@/components/admin/ImageUpload";
import { suggestPortfolioTaxonomy } from "@/app/admin/portfolio/suggestActions";
import type { PortfolioInput } from "@/app/admin/portfolio/actions";

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
  const [content, setContent] = useState(initialData?.content ?? "");
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
      const result = await suggestPortfolioTaxonomy({ title, summary, content });
      if (result.ok) setSuggestions(result);
    } finally {
      setSuggesting(false);
    }
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
      content,
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

  const inputCls =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
  const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";
  const cardCls = "bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* TITLE */}
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item title…"
          className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-orange-400 bg-transparent placeholder:text-gray-300"
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
            className={inputCls}
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
          className={inputCls}
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
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* CONTENT */}
      <div className={cardCls}>
        <label className={labelCls}>Content (HTML)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="<p>Full scenario content…</p>"
          className={`${inputCls} resize-y font-mono text-xs`}
        />
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
              className={`${inputCls} w-24`}
            />
          </div>
          <div className="flex flex-col gap-3 pt-5">
            <Toggle checked={published} onChange={setPublished} label="Published" />
            <Toggle checked={privateLabel} onChange={setPrivateLabel} label="Private label" />
          </div>
        </div>
      </div>

      {/* ARRAY FIELDS */}
      <div className={cardCls}>
        <div className="space-y-5">
          <ArrayInput values={markets} onChange={setMarkets} label="Markets" placeholder="e.g. israel, germany" />
          <ArrayInput values={formats} onChange={setFormats} label="Formats" placeholder="e.g. bulk, retail-pack" />
          <ArrayInput values={certifications} onChange={setCertifications} label="Certifications" placeholder="e.g. kosher, organic, ifs" />
          <ArrayInput values={countries} onChange={setCountries} label="Countries" placeholder="e.g. belgium, netherlands" />
          <ArrayInput values={tags} onChange={setTags} label="Tags" placeholder="e.g. frozen, private-label" />
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
