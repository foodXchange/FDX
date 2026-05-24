"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type GeneratedItem = {
  title: string;
  slug: string;
  category: string | null;
  summary: string | null;
  certifications: string[];
  formats: string[];
  tags: string[];
  priority: number;
  private_label: boolean;
  markets: string[];
  countries: string[];
  content: Record<string, unknown>;
};

type Step = "idle" | "input" | "generating" | "preview" | "saving";

const TONES = ["professional", "conversational"] as const;
type Tone = typeof TONES[number];

export default function PortfolioQuickEntry() {
  const [step, setStep] = useState<Step>("idle");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [generated, setGenerated] = useState<GeneratedItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (step === "input") textareaRef.current?.focus();
  }, [step]);

  function cancel() {
    setStep("idle");
    setDescription("");
    setGenerated(null);
    setError(null);
  }

  async function generate() {
    if (!description.trim()) return;
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/admin/portfolio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), tone }),
      });
      const data = await res.json() as GeneratedItem & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Generation failed");
        setStep("input");
        return;
      }
      setGenerated(data);
      setStep("preview");
    } catch {
      setError("Network error during generation");
      setStep("input");
    }
  }

  async function save() {
    if (!generated) return;
    setStep("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/portfolio/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generated),
      });
      const data = await res.json() as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Save failed");
        setStep("preview");
        return;
      }
      router.push(`/admin/portfolio/${data.id}`);
    } catch {
      setError("Network error during save");
      setStep("preview");
    }
  }

  if (step === "idle") {
    return (
      <button
        onClick={() => setStep("input")}
        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition flex items-center gap-1.5"
      >
        <span>⚡</span> Quick AI entry
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={cancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Quick AI entry</h2>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
          </div>

          <div className="px-6 py-5">
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
                {error}
              </div>
            )}

            {(step === "input" || step === "generating") && (
              <>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Describe the sourcing scenario
                </label>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Organic olive oil from Andalusia, Spain — 200L drums, Beit Yosef certified, private label available"
                  className="w-full h-28 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                  disabled={step === "generating"}
                />

                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tone</span>
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      disabled={step === "generating"}
                      className={`text-xs px-3 py-1 rounded-full border transition capitalize ${
                        tone === t
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "border-slate-200 text-slate-500 hover:border-slate-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "preview" && generated && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Title</p>
                  <p className="text-slate-900 font-semibold">{generated.title}</p>
                </div>
                {generated.category && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Category</p>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{generated.category}</span>
                  </div>
                )}
                {generated.summary && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Summary</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{generated.summary}</p>
                  </div>
                )}
                {generated.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {generated.tags.slice(0, 6).map((tag) => (
                        <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                {generated.countries.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Countries: {generated.countries.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button onClick={cancel} className="text-sm text-slate-500 hover:text-slate-700 transition">
              Cancel
            </button>
            <div className="flex gap-2">
              {step === "preview" && (
                <button
                  onClick={() => setStep("input")}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                >
                  Regenerate
                </button>
              )}
              {(step === "input" || step === "generating") && (
                <button
                  onClick={generate}
                  disabled={!description.trim() || step === "generating"}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition disabled:opacity-50"
                >
                  {step === "generating" ? "Generating…" : "Generate →"}
                </button>
              )}
              {(step === "preview" || step === "saving") && (
                <button
                  onClick={save}
                  disabled={step === "saving"}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition disabled:opacity-50"
                >
                  {step === "saving" ? "Saving…" : "Save & open editor →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
