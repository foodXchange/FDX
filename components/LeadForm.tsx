'use client';
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CopyEmail from "@/components/CopyEmail";

type MatchedItem = {
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  hero_image: string | null;
};

type FormState = "idle" | "submitting" | "success" | "error";

export default function LeadForm() {
  const [state, setState] = useState<FormState>("idle");
  const [matched, setMatched] = useState<MatchedItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [market, setMarket] = useState("");
  const [privateLabel, setPrivateLabel] = useState(false);

  const inputCls =
    "w-full border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition";
  const labelCls = "block text-sm font-medium text-slate-300 mb-1.5";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      const res = await fetch("/api/lead/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: company || undefined,
          message,
          market: market || null,
          privateLabel,
        }),
      });
      const data = await res.json() as { ok?: boolean; matched?: MatchedItem[] };
      if (res.ok && data.ok) {
        setMatched(data.matched || []);
        setState("success");
      } else {
        if (res.status === 429) {
          setErrorMessage("Too many requests — please wait a moment before trying again.");
        } else {
          setErrorMessage(null);
        }
        setState("error");
      }
    } catch {
      setErrorMessage(null);
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="text-center py-12 bg-slate-800/80 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 text-3xl mx-auto mb-6">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Request received</h2>
        <p className="text-slate-300 mb-8 max-w-md mx-auto text-sm leading-relaxed">
          We review each request internally and follow up only if there is a clear fit
          — usually within 1–2 business days.
        </p>

        {matched.length > 0 && (
          <div className="text-left max-w-xl mx-auto mt-8 pt-8 border-t border-white/10">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-4">
              Based on your request, these scenarios may be relevant:
            </p>
            <div className="space-y-4">
              {matched.map((item) => (
                <article
                  key={item.slug}
                  className="group border border-white/10 rounded-2xl overflow-hidden bg-slate-900/90 hover:border-orange-500/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  {item.hero_image && (
                    <Link href={`/en/portfolio/${item.slug}`} className="block">
                      <div className="relative w-full h-36 overflow-hidden">
                        <Image
                          src={item.hero_image}
                          alt={item.title}
                          fill
                          sizes="100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          quality={70}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="text-white text-sm font-semibold leading-tight drop-shadow line-clamp-2">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  )}
                  <div className="p-4">
                    {!item.hero_image && (
                      <Link href={`/en/portfolio/${item.slug}`}>
                        <h3 className="text-white text-sm font-semibold mb-2 hover:text-orange-400 transition-colors">
                          {item.title}
                        </h3>
                      </Link>
                    )}
                    {item.category && (
                      <span className="inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full px-3 py-0.5 text-xs font-medium mb-2">
                        {item.category}
                      </span>
                    )}
                    {item.summary && (
                      <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                    <Link
                      href={`/en/portfolio/${item.slug}`}
                      className="inline-flex items-center text-orange-400 font-medium text-xs hover:text-orange-300"
                    >
                      View scenario →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isSubmitting = state === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-slate-800/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
      <div>
        <label htmlFor="lf-name" className={labelCls}>
          Name <span className="text-orange-400">*</span>
        </label>
        <input
          id="lf-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={isSubmitting}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="lf-email" className={labelCls}>
          Email <span className="text-orange-400">*</span>
        </label>
        <input
          id="lf-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          disabled={isSubmitting}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="lf-company" className={labelCls}>
          Company <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          id="lf-company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Your company"
          disabled={isSubmitting}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="lf-message" className={labelCls}>
          What are you sourcing? <span className="text-orange-400">*</span>
        </label>
        <textarea
          id="lf-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the product, format, certifications, market, or any other relevant details…"
          disabled={isSubmitting}
          className={`${inputCls} resize-none`}
        />
      </div>

      <div>
        <label htmlFor="lf-market" className={labelCls}>
          Target market <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <select
          id="lf-market"
          value={market}
          onChange={(e) => setMarket(e.target.value)}
          disabled={isSubmitting}
          className={inputCls}
        >
          <option value="" className="bg-slate-800 text-white">Select…</option>
          <option value="Retail" className="bg-slate-800 text-white">Retail</option>
          <option value="Foodservice" className="bg-slate-800 text-white">Foodservice</option>
          <option value="Industry" className="bg-slate-800 text-white">Industry</option>
        </select>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none py-1">
        <input
          type="checkbox"
          checked={privateLabel}
          onChange={(e) => setPrivateLabel(e.target.checked)}
          disabled={isSubmitting}
          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-400 focus:ring-offset-slate-800"
        />
        <span className="text-sm text-slate-300">Private label / own brand</span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Sending…" : "Send request →"}
      </button>

      {state === "error" && (
        <p className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm mt-3 text-center">
          {errorMessage ?? (
            <>
              Something went wrong — please try again or email us at{" "}
              <CopyEmail email="info@foodz-x.com" />
            </>
          )}
        </p>
      )}
    </form>
  );
}
