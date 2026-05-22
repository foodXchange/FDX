"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "generate" | "saved" | "history" | "image";
type Tone = "Professional" | "Detailed" | "Concise" | "Technical" | "Story-driven";
type SpeechLang = "en" | "he";
type ImageStyle = "Product photography" | "Editorial" | "Lifestyle" | "Industrial/factory";

interface GeneratedData {
  title: string;
  slug: string;
  category: string;
  summary: string;
  certifications: string[];
  formats: string[];
  tags: string[];
  priority: number;
  private_label: boolean;
  markets: string[];
  countries: string[];
  sourcing_brief: string;
  market_challenge: string;
  what_we_validated: string;
  what_we_found: string;
  key_takeaways: string;
}

interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
  lastUsed: string | null;
  useCount: number;
}

interface GenerationHistoryItem {
  id: string;
  timestamp: string;
  description: string;
  tone: string;
  generatedData: GeneratedData;
  fieldsGenerated: string[];
}

interface SavedImagePrompt {
  id: string;
  scenario: string;
  prompt: string;
  createdAt: string;
}

interface Props {
  setTitle: (v: string) => void;
  setSlug: (v: string) => void;
  setSlugEdited: (v: boolean) => void;
  setCategory: (v: string) => void;
  setSummary: (v: string) => void;
  setBrief: (v: string) => void;
  setChallenge: (v: string) => void;
  setValidated: (v: string) => void;
  setFindings: (v: string) => void;
  setTakeaways: (v: string) => void;
  setPriority: (v: number) => void;
  setPrivateLabel: (v: boolean) => void;
  setMarkets: (v: string[]) => void;
  setFormats: (v: string[]) => void;
  setCertifications: (v: string[]) => void;
  setCountries: (v: string[]) => void;
  setTags: (v: string[]) => void;
  setHighlightingField: (field: string | null) => void;
  title: string;
  category: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_SAVED_PROMPTS = "fdx-portfolio-saved-prompts";
const LS_HISTORY = "fdx-portfolio-generation-history";
const LS_IMAGE_PROMPTS = "fdx-portfolio-image-prompts";

const TONES: Tone[] = ["Professional", "Detailed", "Concise", "Technical", "Story-driven"];
const IMAGE_STYLES: ImageStyle[] = ["Product photography", "Editorial", "Lifestyle", "Industrial/factory"];

const EXAMPLE_CHIPS = [
  "Kosher EVOO 750ml glass, Chief Rabbinate, Spain/Italy, private label, Shufersal",
  "Organic granola Badatz, sugar-free, 400g retail bag, Israeli health chains",
  "Frozen potato wedges, Chief Rabbinate, 50 tons/year, retail and foodservice",
  "Canned tuna 185g Chief Rabbinate, private label, major retail chain",
];

const DEFAULT_PROMPTS: SavedPrompt[] = [
  {
    id: "default-1",
    name: "Retail olive oil",
    prompt: "Kosher EVOO for Israeli retail, 750ml and 500ml glass bottles, Chief Rabbinate certification, private label, Mediterranean origin, BRC certified supplier, 18 containers per year volume",
    createdAt: new Date().toISOString(),
    lastUsed: null,
    useCount: 0,
  },
  {
    id: "default-2",
    name: "Organic retail product",
    prompt: "Organic product for Israeli health retail chains, Badatz or Chief Rabbinate kosher, EU organic certified, private label, retail bags, 10-15 containers per year",
    createdAt: new Date().toISOString(),
    lastUsed: null,
    useCount: 0,
  },
  {
    id: "default-3",
    name: "Canned goods retail",
    prompt: "Canned product for Israeli mainstream retail, Chief Rabbinate kosher, BRC or IFS certified, private label, 400g standard format, 20-30 containers per year, Mediterranean or Eastern European origin",
    createdAt: new Date().toISOString(),
    lastUsed: null,
    useCount: 0,
  },
  {
    id: "default-4",
    name: "Frozen foodservice",
    prompt: "Frozen product for Israeli retail and foodservice, Chief Rabbinate kosher, IFS or BRC certified, bulk and retail formats, 50+ containers per year, European origin preferred",
    createdAt: new Date().toISOString(),
    lastUsed: null,
    useCount: 0,
  },
  {
    id: "default-5",
    name: "Premium import product",
    prompt: "Premium food product for Israeli specialty retail and premium supermarket chains, Badatz preferred, BRC AA certified, branded or private label, smaller volumes 5-10 containers, Western European origin",
    createdAt: new Date().toISOString(),
    lastUsed: null,
    useCount: 0,
  },
  {
    id: "default-6",
    name: "Snacks and confectionery",
    prompt: "Kosher snack product for Israeli retail, Chief Rabbinate minimum, private label, retail shelf-ready packaging, multiple SKUs, 15-25 containers per year, European manufacturer",
    createdAt: new Date().toISOString(),
    lastUsed: null,
    useCount: 0,
  },
];

// Web Speech API types (not included in all TS DOM lib configurations)
interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PortfolioAIAssistant({
  setTitle, setSlug, setSlugEdited, setCategory, setSummary,
  setBrief, setChallenge, setValidated, setFindings, setTakeaways,
  setPriority, setPrivateLabel, setMarkets, setFormats,
  setCertifications, setCountries, setTags,
  setHighlightingField,
  title, category,
}: Props) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("generate");

  // Generate tab
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState<Tone>("Story-driven");
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Voice input
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<SpeechLang>("en");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Saved prompts
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [savePromptName, setSavePromptName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  // History
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);

  // Image prompt tab
  const [imageScenario, setImageScenario] = useState("");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("Editorial");
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imagePromptText, setImagePromptText] = useState("");
  const [savedImagePrompts, setSavedImagePrompts] = useState<SavedImagePrompt[]>([]);
  const [imageCopied, setImageCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = lsGet<SavedPrompt[]>(LS_SAVED_PROMPTS, []);
    setSavedPrompts(stored.length > 0 ? stored : DEFAULT_PROMPTS);
    setHistory(lsGet<GenerationHistoryItem[]>(LS_HISTORY, []));
    setSavedImagePrompts(lsGet<SavedImagePrompt[]>(LS_IMAGE_PROMPTS, []));
  }, []);

  // Persist saved prompts
  useEffect(() => { lsSet(LS_SAVED_PROMPTS, savedPrompts); }, [savedPrompts]);
  useEffect(() => { lsSet(LS_HISTORY, history); }, [history]);
  useEffect(() => { lsSet(LS_IMAGE_PROMPTS, savedImagePrompts); }, [savedImagePrompts]);

  // Auto-populate image scenario when switching to image tab
  useEffect(() => {
    if (activeTab === "image" && !imageScenario && (title || category)) {
      setImageScenario([title, category].filter(Boolean).join(" — "));
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Voice input ────────────────────────────────────────────────────────────

  function startListening() {
    const SR: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input requires Chrome or Edge browser");
      return;
    }
    const r: SpeechRecognitionInstance = new SR();
    r.lang = speechLang === "he" ? "he-IL" : "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setInterimText(interim);
      if (final) setDescription((prev) => prev + (prev ? " " : "") + final.trim());
    };
    r.onend = () => { setListening(false); setInterimText(""); };
    recognitionRef.current = r;
    r.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  // ── Cascading field populate ───────────────────────────────────────────────

  function populateFields(data: GeneratedData) {
    type Step = [string, () => void];
    const steps: Step[] = [
      ["title",          () => setTitle(data.title)],
      ["slug",           () => { setSlug(data.slug); setSlugEdited(true); }],
      ["category",       () => setCategory(data.category)],
      ["summary",        () => setSummary(data.summary)],
      ["private_label",  () => setPrivateLabel(data.private_label)],
      ["markets",        () => setMarkets(data.markets)],
      ["priority",       () => setPriority(data.priority)],
      ["certifications", () => setCertifications(data.certifications)],
      ["formats",        () => setFormats(data.formats)],
      ["tags",           () => setTags(data.tags)],
      ["countries",      () => setCountries(data.countries)],
      ["brief",          () => setBrief(data.sourcing_brief)],
      ["challenge",      () => setChallenge(data.market_challenge)],
      ["validated",      () => setValidated(data.what_we_validated)],
      ["findings",       () => setFindings(data.what_we_found)],
      ["takeaways",      () => setTakeaways(data.key_takeaways)],
    ];

    steps.forEach(([field, setter], idx) => {
      setTimeout(() => {
        setter();
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightingField(field);
        highlightTimerRef.current = setTimeout(() => setHighlightingField(null), 300);
      }, 80 * idx);
    });

    setTimeout(() => setGenSuccess(true), 80 * steps.length + 350);
  }

  // ── Generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!description.trim()) return;
    setGenerating(true);
    setGenError(null);
    setGenSuccess(false);

    try {
      const res = await fetch("/api/admin/portfolio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), tone }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: GeneratedData;
        error?: string;
        raw?: string;
      };

      if (!json.ok || !json.data) {
        setGenError(json.error ?? "Generation failed");
        return;
      }

      populateFields(json.data);

      const historyItem: GenerationHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        description: description.trim(),
        tone,
        generatedData: json.data,
        fieldsGenerated: Object.keys(json.data),
      };
      setHistory((prev) => [historyItem, ...prev].slice(0, 20));
    } catch {
      setGenError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }

  // ── Saved prompts ──────────────────────────────────────────────────────────

  function saveCurrentPrompt() {
    if (!savePromptName.trim() || !description.trim()) return;
    const p: SavedPrompt = {
      id: crypto.randomUUID(),
      name: savePromptName.trim(),
      prompt: description.trim(),
      createdAt: new Date().toISOString(),
      lastUsed: null,
      useCount: 0,
    };
    setSavedPrompts((prev) => [p, ...prev]);
    setSavePromptName("");
    setShowSaveInput(false);
  }

  function loadSavedPrompt(p: SavedPrompt) {
    setDescription(p.prompt);
    setActiveTab("generate");
    setSavedPrompts((prev) =>
      prev.map((sp) =>
        sp.id === p.id
          ? { ...sp, lastUsed: new Date().toISOString(), useCount: sp.useCount + 1 }
          : sp
      )
    );
  }

  function deleteSavedPrompt(id: string) {
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Image prompt ───────────────────────────────────────────────────────────

  async function handleGenerateImagePrompt() {
    if (!imageScenario.trim()) return;
    setImageGenerating(true);
    setImagePromptText("");
    try {
      const res = await fetch("/api/admin/portfolio/generate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: imageScenario.trim(), style: imageStyle }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        prompt?: string;
        error?: string;
      };
      if (json.ok && json.prompt) setImagePromptText(json.prompt);
    } catch { /* ignore */ }
    finally { setImageGenerating(false); }
  }

  async function copyImagePrompt() {
    if (!imagePromptText) return;
    await navigator.clipboard.writeText(imagePromptText);
    setImageCopied(true);
    setTimeout(() => setImageCopied(false), 2000);
  }

  async function copyPromptText() {
    if (!description) return;
    await navigator.clipboard.writeText(description);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  function saveImagePrompt() {
    if (!imagePromptText) return;
    const p: SavedImagePrompt = {
      id: crypto.randomUUID(),
      scenario: imageScenario,
      prompt: imagePromptText,
      createdAt: new Date().toISOString(),
    };
    setSavedImagePrompts((prev) => [p, ...prev]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-900 border border-violet-200 rounded-xl px-4 py-2.5 bg-violet-50 hover:bg-violet-100 transition w-full"
        >
          <span className="text-base">✦</span>
          <span>AI Assistant</span>
          <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white border border-violet-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <span className="text-violet-600 text-lg">✦</span>
          <span className="text-sm font-semibold text-violet-800">AI Assistant</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-violet-500 hover:text-violet-700 border border-violet-200 rounded-lg px-2.5 py-1 hover:bg-violet-100 transition"
        >
          Collapse ↑
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        {(
          [
            { id: "generate" as Tab, label: "Generate" },
            { id: "saved" as Tab, label: "Saved Prompts" },
            { id: "history" as Tab, label: "History" },
            { id: "image" as Tab, label: "Image Prompt" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs font-medium py-2.5 transition border-b-2 ${
              activeTab === tab.id
                ? "border-violet-500 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── GENERATE TAB ─────────────────────────────────────────────── */}
        {activeTab === "generate" && (
          <div className="space-y-4">
            {/* Description + Voice */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Describe this sourcing scenario
                </label>
                {/* Language pills */}
                <div className="flex items-center gap-1">
                  {(["en", "he"] as SpeechLang[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSpeechLang(lang)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                        speechLang === lang
                          ? "bg-violet-600 text-white border-violet-600"
                          : "border-gray-200 text-gray-500 hover:border-violet-300"
                      }`}
                    >
                      {lang === "en" ? "EN" : "עב"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder={`Describe naturally. For example:\n\n'Shufersal needs kosher EVOO in 750ml glass bottles from Spain or Italy. Chief Rabbinate. Private label. Around 18 containers per year. BRC required.'\n\nOr speak in Hebrew — AI understands both.`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                />
                {/* Mic button */}
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  title={listening ? "Stop recording" : "Start voice input"}
                  className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition ${
                    listening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-gray-100 text-gray-500 hover:bg-violet-100 hover:text-violet-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v7a2 2 0 004 0V5a2 2 0 00-2-2zM8 12a4 4 0 008 0h2a6 6 0 01-12 0H8zm4 7v2H9v2h6v-2h-3v-2h-0z" />
                  </svg>
                </button>
              </div>

              {listening && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                  Listening…
                  {interimText && (
                    <span className="text-slate-400 italic ml-1">{interimText}</span>
                  )}
                </p>
              )}

              {/* Save prompt */}
              <div className="flex items-center gap-2 mt-2">
                {description.trim() && !showSaveInput && (
                  <button
                    type="button"
                    onClick={() => setShowSaveInput(true)}
                    className="text-xs text-violet-600 hover:text-violet-800 hover:underline"
                  >
                    + Save this prompt
                  </button>
                )}
                {description.trim() && (
                  <button
                    type="button"
                    onClick={copyPromptText}
                    className="text-xs text-gray-400 hover:text-gray-600 hover:underline ml-auto"
                  >
                    {promptCopied ? "✓ Copied" : "Copy"}
                  </button>
                )}
              </div>
              {showSaveInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={savePromptName}
                    onChange={(e) => setSavePromptName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveCurrentPrompt(); }}
                    placeholder="Prompt name…"
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <button
                    type="button"
                    onClick={saveCurrentPrompt}
                    className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveInput(false)}
                    className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Example chips */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Quick examples:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDescription(chip)}
                    className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-full hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition truncate max-w-[260px]"
                    title={chip}
                  >
                    {chip.length > 55 ? chip.slice(0, 55) + "…" : chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone selector */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Tone
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      tone === t
                        ? "bg-violet-600 text-white border-violet-600"
                        : "border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !description.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                "Generate all fields →"
              )}
            </button>

            {/* Error */}
            {genError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {genError}
              </p>
            )}

            {/* Success banner */}
            {genSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  ✓ All fields generated — review and save when ready
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { setGenSuccess(false); handleGenerate(); }}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(""); setSlug(""); setCategory(""); setSummary("");
                      setBrief(""); setChallenge(""); setValidated(""); setFindings(""); setTakeaways("");
                      setPriority(0); setPrivateLabel(false);
                      setMarkets([]); setFormats([]); setCertifications([]); setCountries([]); setTags([]);
                      setGenSuccess(false);
                    }}
                    className="text-xs px-3 py-1 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SAVED PROMPTS TAB ─────────────────────────────────────────── */}
        {activeTab === "saved" && (
          <div className="space-y-3">
            {savedPrompts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No saved prompts yet.</p>
            ) : (
              savedPrompts.map((p) => (
                <div key={p.id} className="border border-gray-100 rounded-xl px-4 py-3 hover:border-violet-200 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {p.prompt.slice(0, 60)}{p.prompt.length > 60 ? "…" : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {p.lastUsed && (
                          <span className="text-[10px] text-gray-400">
                            Used {formatTimestamp(p.lastUsed)}
                          </span>
                        )}
                        {p.useCount > 0 && (
                          <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                            {p.useCount}×
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadSavedPrompt(p)}
                        className="text-xs px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-100 transition"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedPrompt(p.id)}
                        className="text-xs px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No generations yet — use the Generate tab to get started.
              </p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-xl px-4 py-3 hover:border-violet-200 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{formatTimestamp(item.timestamp)}</p>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {item.description.slice(0, 80)}{item.description.length > 80 ? "…" : ""}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Tone: {item.tone} · {item.fieldsGenerated.length} fields
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          populateFields(item.generatedData);
                          setDescription(item.description);
                          setTone(item.tone as Tone);
                        }}
                        className="text-xs px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-100 transition"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDescription(item.description); setActiveTab("generate"); }}
                        className="text-xs px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                      >
                        Copy prompt
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── IMAGE PROMPT TAB ──────────────────────────────────────────── */}
        {activeTab === "image" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Generate image prompt
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Use with Ideogram, Midjourney, or DALL-E to create the scenario hero image.
              </p>
            </div>

            {/* Scenario input */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                What is this scenario about?
              </label>
              <textarea
                value={imageScenario}
                onChange={(e) => setImageScenario(e.target.value)}
                rows={3}
                placeholder="e.g. Extra virgin olive oil, Mediterranean, retail bottles"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
              />
            </div>

            {/* Style selector */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Style</p>
              <div className="flex flex-wrap gap-1.5">
                {IMAGE_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setImageStyle(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      imageStyle === s
                        ? "bg-violet-600 text-white border-violet-600"
                        : "border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerateImagePrompt}
              disabled={imageGenerating || !imageScenario.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              {imageGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                "Generate image prompt"
              )}
            </button>

            {/* Generated prompt */}
            {imagePromptText && (
              <div>
                <textarea
                  value={imagePromptText}
                  onChange={(e) => setImagePromptText(e.target.value)}
                  rows={8}
                  className="w-full border border-violet-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 bg-violet-50/30"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={copyImagePrompt}
                    className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                  >
                    {imageCopied ? "✓ Copied" : "Copy prompt"}
                  </button>
                  <button
                    type="button"
                    onClick={saveImagePrompt}
                    className="text-xs px-3 py-1.5 border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-50 transition"
                  >
                    Save prompt
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateImagePrompt}
                    className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                  >
                    Regenerate
                  </button>
                  <a
                    href="https://ideogram.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition ml-auto"
                  >
                    Open Ideogram ↗
                  </a>
                </div>
              </div>
            )}

            {/* Saved image prompts */}
            {savedImagePrompts.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Saved image prompts
                </p>
                <div className="space-y-2">
                  {savedImagePrompts.map((p) => (
                    <div key={p.id} className="border border-gray-100 rounded-xl px-3 py-2.5 hover:border-violet-200 transition">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{p.scenario}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {p.prompt.slice(0, 100)}{p.prompt.length > 100 ? "…" : ""}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(p.prompt)}
                            className="text-[10px] px-2 py-0.5 border border-gray-200 text-gray-500 rounded hover:bg-gray-50 transition"
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => setSavedImagePrompts((prev) => prev.filter((sp) => sp.id !== p.id))}
                            className="text-[10px] text-red-400 hover:text-red-600 px-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
