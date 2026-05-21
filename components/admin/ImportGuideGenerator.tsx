'use client';
import { useState, useEffect, useRef } from "react";
import { IMPORT_GUIDE_CATEGORIES } from "@/types/importGuide";
import { createImportArticle, publishAllDrafts } from "@/app/admin/import-guide/actions";

interface TopicItem {
  topic: string;
  category: string;
}

interface ExistingArticle {
  slug: string;
  id: string;
}

interface Props {
  existingArticles: ExistingArticle[];
}

const TOPICS: TopicItem[] = [
  // LABELING (8)
  { topic: "Hebrew Labeling Requirements for Imported Food Products", category: "labeling" },
  { topic: "Nutrition Facts Panel Requirements for Israeli Market", category: "labeling" },
  { topic: "Ingredient List Rules for Food Imports to Israel", category: "labeling" },
  { topic: "Allergen Labeling Requirements in Israel", category: "labeling" },
  { topic: "Net Quantity and Weight Declarations on Israeli Food Labels", category: "labeling" },
  { topic: "Country of Origin Labeling Rules for Food Imports to Israel", category: "labeling" },
  { topic: "Shelf Life and Expiry Date Requirements on Israeli Labels", category: "labeling" },
  { topic: "Storage Instructions and Handling Conditions on Israeli Labels", category: "labeling" },

  // KOSHER (6)
  { topic: "Introduction to Kosher Certification for Food Exporters", category: "kosher" },
  { topic: "Major Israeli Kosher Certification Bodies and How to Choose", category: "kosher" },
  { topic: "Kosher for Passover Requirements for Food Manufacturers", category: "kosher" },
  { topic: "Dairy vs Pareve vs Meat Classification in Kosher Food Production", category: "kosher" },
  { topic: "Kosher Certification Process: Step by Step for Manufacturers", category: "kosher" },
  { topic: "How Much Does Kosher Certification Cost and How Long Does It Take", category: "kosher" },

  // STANDARDS (6)
  { topic: "Standards Institution of Israel: What Food Importers Need to Know", category: "standards" },
  { topic: "Mandatory Israeli Standards (SI Marks) for Food Products", category: "standards" },
  { topic: "How to Get Israeli Standards Approval for Your Food Product", category: "standards" },
  { topic: "Israeli Food Safety Regulations: Overview for Importers", category: "standards" },
  { topic: "Pesticide Residue Limits and Testing Requirements in Israel", category: "standards" },
  { topic: "Food Additives Permitted in Israel: What Manufacturers Must Know", category: "standards" },

  // PERMITS (5)
  { topic: "Import Permits for Food Products to Israel: Complete Guide", category: "permits" },
  { topic: "Health Certificates Required for Food Imports to Israel", category: "permits" },
  { topic: "Phytosanitary Certificates for Plant-Based Food Imports to Israel", category: "permits" },
  { topic: "Israeli Customs Clearance Process for Food Products", category: "permits" },
  { topic: "Documents Required for Food Import to Israel: Complete Checklist", category: "permits" },

  // BY CATEGORY (5)
  { topic: "Importing Tomato Products to Israel: Regulations and Requirements", category: "categories" },
  { topic: "Importing Pasta and Grain Products to Israel: What You Need to Know", category: "categories" },
  { topic: "Importing Snack Foods to Israel: Labeling, Kosher, and Compliance", category: "categories" },
  { topic: "Importing Dairy Products to Israel: Strict Rules and Requirements", category: "categories" },
  { topic: "Importing Canned and Preserved Foods to Israel: Regulations Overview", category: "categories" },

  // BY COUNTRY (5)
  { topic: "Exporting Food from Italy to Israel: Trade Rules and Requirements", category: "countries" },
  { topic: "Exporting Food from Spain to Israel: Regulations and Bilateral Agreements", category: "countries" },
  { topic: "Exporting Food from Turkey to Israel: What Manufacturers Need to Know", category: "countries" },
  { topic: "Exporting Food from China to Israel: Documentation and Compliance", category: "countries" },
  { topic: "EU Food Exporters Guide to the Israeli Market", category: "countries" },

  // COLD CHAIN (4)
  { topic: "Cold Chain Requirements for Food Imports to Israel", category: "cold-chain" },
  { topic: "Packaging Requirements for Food Imports to Israel", category: "cold-chain" },
  { topic: "Frozen Food Import Requirements and Temperature Standards in Israel", category: "cold-chain" },
  { topic: "Chilled and Fresh Food Imports to Israel: Requirements and Logistics", category: "cold-chain" },

  // CERTIFICATIONS (4)
  { topic: "BRC Global Standard: Do Israeli Buyers Require It?", category: "certifications" },
  { topic: "IFS Food Certification and Israeli Market Requirements", category: "certifications" },
  { topic: "FSSC 22000 and HACCP Requirements for Exporting to Israel", category: "certifications" },
  { topic: "Organic Certification for Food Exports to Israel", category: "certifications" },

  // CUSTOMS (3)
  { topic: "Import Duties and Tariff Rates for Food Products to Israel", category: "customs" },
  { topic: "VAT on Food Imports to Israel: Rules and Exemptions", category: "customs" },
  { topic: "Free Trade Agreements Affecting Food Imports to Israel", category: "customs" },
];

function topicToSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (
        block.startsWith("<h") ||
        block.startsWith("<ul") ||
        block.startsWith("<li")
      ) {
        return block;
      }
      return `<p>${block}</p>`;
    })
    .join("\n");
}

export default function ImportGuideGenerator({ existingArticles }: Props) {
  const existingSlugs = existingArticles.map((a) => a.slug);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Set<string>>(new Set());
  const [generatedIds, setGeneratedIds] = useState<Record<string, string>>({});
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    const preExisting = new Set(
      TOPICS.map((t) => topicToSlug(t.topic)).filter((slug) =>
        existingSlugs.includes(slug)
      )
    );
    setGenerated(preExisting);
    // seed IDs for all pre-existing articles so Edit links work immediately
    const idMap: Record<string, string> = {};
    for (const a of existingArticles) {
      idMap[a.slug] = a.id;
    }
    setGeneratedIds((prev) => ({ ...idMap, ...prev }));
  }, [existingArticles]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTopics =
    activeCategory === "all"
      ? TOPICS
      : TOPICS.filter((t) => t.category === activeCategory);

  const generatedCount = TOPICS.filter((t) =>
    generated.has(topicToSlug(t.topic))
  ).length;

  async function generateArticle(topic: TopicItem) {
    setGenerating(topic.topic);
    setStreamText("");
    setError(null);

    let fullText = "";

    try {
      const categoryTitle =
        IMPORT_GUIDE_CATEGORIES.find((c) => c.slug === topic.category)?.title ??
        topic.category;

      const res = await fetch("/api/admin/import-guide/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.topic,
          category: topic.category,
          categoryTitle,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string };
        throw new Error(err.message ?? err.error ?? "Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;
          setStreamText(fullText.slice(0, 150) + "…");
        }
      }

      const parts = fullText.split("---JSON---");
      const rawMarkdown = parts[0].trim();
      const jsonPart = parts[1]?.split("---END JSON---")[0]?.trim();

      const articleHtml = markdownToHtml(rawMarkdown);

      let meta = {
        summary: "",
        tags: [] as string[],
        meta_title: "",
        meta_description: "",
        reading_time_mins: 5,
      };
      if (jsonPart) {
        try {
          meta = JSON.parse(jsonPart) as typeof meta;
        } catch {
          // use defaults if JSON parse fails
        }
      }

      const slug = topicToSlug(topic.topic);
      const wordCount = rawMarkdown.split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      setSaving(true);

      const result = await createImportArticle({
        title: topic.topic,
        slug,
        category: topic.category,
        summary: meta.summary || undefined,
        content: articleHtml,
        tags: meta.tags ?? [],
        related_portfolio_slugs: [],
        published: true,
        meta_title: meta.meta_title || undefined,
        meta_description: meta.meta_description || undefined,
        reading_time_mins: meta.reading_time_mins ?? readingTime,
      });

      if (result.ok) {
        setGenerated((prev) => new Set([...prev, slug]));
        setGeneratedIds((prev) => ({ ...prev, [slug]: result.id }));
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(null);
      setSaving(false);
      setStreamText("");
    }
  }

  async function generateAll() {
    const pending = TOPICS.filter((t) => {
      const slug = topicToSlug(t.topic);
      return !generated.has(slug) && !existingSlugs.includes(slug);
    });
    if (pending.length === 0) return;

    stopRef.current = false;
    setGeneratingAll(true);
    setError(null);

    for (let i = 0; i < pending.length; i++) {
      if (stopRef.current) break;
      setBulkProgress({ current: i + 1, total: pending.length });
      await generateArticle(pending[i]);
    }

    setGeneratingAll(false);
    setBulkProgress(null);
    stopRef.current = false;
  }

  async function publishAll() {
    if (!confirm("Publish all draft articles now?")) return;
    const result = await publishAllDrafts();
    if (!result.ok) setError(result.error);
  }

  const categoryPills = [
    { slug: "all", label: "All" },
    ...IMPORT_GUIDE_CATEGORIES.map((c) => ({ slug: c.slug, label: c.title })),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">AI Article Generator</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Click Generate on any topic, or use Generate All to run the full queue sequentially.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {generatingAll ? (
            <>
              <span className="text-xs text-orange-600 font-medium">
                Generating {bulkProgress?.current}/{bulkProgress?.total}…
              </span>
              <button
                onClick={() => { stopRef.current = true; }}
                className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 transition"
              >
                Stop
              </button>
            </>
          ) : (
            <>
              <button
                onClick={generateAll}
                disabled={!!generating || generatedCount === TOPICS.length}
                className="text-xs px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate All
              </button>
              <button
                onClick={publishAll}
                className="text-xs px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition"
              >
                Save & Publish All
              </button>
            </>
          )}
          <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {generatedCount} / {TOPICS.length} generated
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {categoryPills.map((pill) => (
          <button
            key={pill.slug}
            onClick={() => setActiveCategory(pill.slug)}
            className={`text-xs px-3 py-1.5 rounded-full transition ${
              activeCategory === pill.slug
                ? "bg-orange-500 text-white"
                : "border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Topic list */}
      <div className="divide-y divide-slate-100">
        {filteredTopics.map((item) => {
          const slug = topicToSlug(item.topic);
          const isGenerated = generated.has(slug) || existingSlugs.includes(slug);
          const isGenerating = generating === item.topic;

          return (
            <div key={item.topic} className="py-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-100 text-slate-500 text-xs rounded-full px-2 py-0.5 shrink-0">
                      {IMPORT_GUIDE_CATEGORIES.find((c) => c.slug === item.category)?.title ??
                        item.category}
                    </span>
                    <span className="text-sm text-slate-800 font-medium">{item.topic}</span>
                  </div>
                  {isGenerating && streamText && (
                    <p className="text-xs text-slate-400 italic mt-1.5 pl-1 truncate max-w-xl">
                      {streamText}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {isGenerated ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                        ✓ Generated
                      </span>
                      <a
                        href={`/admin/import-guide/${generatedIds[slug] ?? slug}`}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        Edit
                      </a>
                    </div>
                  ) : isGenerating ? (
                    <div className="flex items-center gap-2 text-orange-600 text-xs font-medium">
                      <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      {saving ? "Saving…" : "Generating…"}
                    </div>
                  ) : (
                    <button
                      onClick={() => generateArticle(item)}
                      disabled={!!generating || generatingAll}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Generate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
