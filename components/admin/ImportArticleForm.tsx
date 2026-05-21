'use client';
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import ArrayInput from "@/components/admin/ArrayInput";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";
import type { ImportGuideArticle } from "@/types/importGuide";
import {
  createImportArticle,
  updateImportArticle,
  type ImportArticleInput,
} from "@/app/admin/import-guide/actions";

interface PortfolioItem {
  slug: string;
  title: string;
  category: string;
}

interface Props {
  article: ImportGuideArticle | null;
  portfolioItems: PortfolioItem[];
}

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

export default function ImportArticleForm({ article, portfolioItems }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!!article?.slug);
  const [seoOpen, setSeoOpen] = useState(false);

  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [category, setCategory] = useState(article?.category ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [tags, setTags] = useState<string[]>(article?.tags ?? []);
  const [relatedSlugs, setRelatedSlugs] = useState<string[]>(
    article?.related_portfolio_slugs ?? []
  );
  const [metaTitle, setMetaTitle] = useState(article?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(article?.meta_description ?? "");
  const [readingTime, setReadingTime] = useState(article?.reading_time_mins ?? 5);
  const [published, setPublished] = useState(article?.published ?? false);

  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugEdited]);

  function toggleRelated(itemSlug: string) {
    setRelatedSlugs((prev) =>
      prev.includes(itemSlug) ? prev.filter((s) => s !== itemSlug) : [...prev, itemSlug]
    );
  }

  function buildData(): ImportArticleInput {
    return {
      title,
      slug,
      category,
      summary: summary || undefined,
      content: content || undefined,
      tags,
      related_portfolio_slugs: relatedSlugs,
      published,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
      reading_time_mins: readingTime,
    };
  }

  function handleSave() {
    setError("");
    setSaved(false);
    const data = buildData();

    startTransition(async () => {
      if (article) {
        const result = await updateImportArticle(article.id, data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const result = await createImportArticle(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/admin/import-guide/${result.id}`);
      }
    });
  }

  const inputCls =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
  const labelCls =
    "text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";
  const cardCls = "bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm";

  return (
    <div>
      {/* Sticky top bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a
          href="/admin/import-guide"
          className="text-sm text-orange-600 hover:text-orange-700 font-medium shrink-0"
        >
          ← Import Guide
        </a>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {title || "New Article"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {saved && (
            <span className="text-xs text-green-600 font-medium">Saved ✓</span>
          )}
          {article && (
            <a
              href={`/en/import-guide/${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:border-orange-300 hover:text-orange-600 transition"
            >
              Preview ↗
            </a>
          )}
          <Toggle checked={published} onChange={setPublished} label="Published" />
          <button
            onClick={handleSave}
            disabled={pending || !title || !slug || !category}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title…"
            className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-orange-400 bg-transparent placeholder:text-gray-300"
          />
        </div>

        {/* Slug */}
        <div className={cardCls}>
          <label className={labelCls}>Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">fdx.trading/en/import-guide/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }}
              placeholder="auto-generated"
              className={inputCls}
            />
          </div>
        </div>

        {/* Category */}
        <div className={cardCls}>
          <label className={labelCls}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a category…</option>
            {IMPORT_GUIDE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.icon} {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div className={cardCls}>
          <label className={labelCls}>
            Summary{" "}
            <span className="text-gray-400 font-normal normal-case ml-1">
              {summary.length}/300
            </span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Short description shown on article cards…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Content */}
        <div className={cardCls}>
          <label className={labelCls}>Article content (HTML)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            placeholder="<p>Article content generated by AI or written manually…</p>"
            className={`${inputCls} resize-y font-mono text-xs`}
          />
        </div>

        {/* Tags */}
        <div className={cardCls}>
          <ArrayInput
            values={tags}
            onChange={setTags}
            label="Tags"
            placeholder="e.g. labeling, kosher, moh"
          />
        </div>

        {/* Related portfolio */}
        {portfolioItems.length > 0 && (
          <div className={cardCls}>
            <label className={labelCls}>Related portfolio scenarios</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {portfolioItems.map((item) => (
                <label key={item.slug} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={relatedSlugs.includes(item.slug)}
                    onChange={() => toggleRelated(item.slug)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">{item.title}</span>
                  <span className="text-xs text-gray-400">({item.category})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* SEO (collapsible) */}
        <div className={cardCls}>
          <button
            type="button"
            onClick={() => setSeoOpen(!seoOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full text-left"
          >
            <span>SEO Settings</span>
            <span className="text-gray-400 text-xs ml-auto">{seoOpen ? "▲" : "▼"}</span>
          </button>

          {seoOpen && (
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelCls}>
                  Meta title{" "}
                  <span className="text-gray-400 font-normal normal-case ml-1">
                    {metaTitle.length}/60
                  </span>
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={60}
                  placeholder={title || "Defaults to article title"}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Meta description{" "}
                  <span className="text-gray-400 font-normal normal-case ml-1">
                    {metaDescription.length}/160
                  </span>
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder={summary || "Defaults to summary"}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reading time */}
        <div className={cardCls}>
          <label className={labelCls}>Reading time (minutes)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={readingTime}
            onChange={(e) => setReadingTime(Number(e.target.value))}
            className={`${inputCls} w-24`}
          />
          <p className="text-xs text-gray-400 mt-1.5">Auto-calculated from word count on save</p>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* Save row */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={pending || !title || !slug || !category}
            className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Saving…" : article ? "Save changes" : "Create article"}
          </button>
          <a
            href="/admin/import-guide"
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
