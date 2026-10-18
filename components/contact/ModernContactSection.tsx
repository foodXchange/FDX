"use client";

import { useState } from "react";

type RoleType = "buyer" | "supplier" | "general";

const CATEGORIES = [
  "Tomato Products",
  "Oils & Fats",
  "Pasta & Grains",
  "Canned Foods",
  "Confectionery & Snacks",
  "Frozen Foods",
  "Private Label",
  "Kosher Certification",
];

const TEMPLATES: Record<RoleType, string> = {
  buyer: `Product category: 
Target volumes: 
Packaging & Format: 
Key requirements (Kosher / Private Label): `,
  supplier: `Products & Categories: 
Factory location: 
Certifications (BRC / IFS / Kosher): 
Annual capacity / MOQ: `,
  general: `Topic of inquiry: 
Details: `,
};

export default function ModernContactSection() {
  const [role, setRole] = useState<RoleType>("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = () => {
    setMessage(TEMPLATES[role]);
  };

  const handleCategoryClick = (cat: string) => {
    if (selectedCategory === cat) {
      setSelectedCategory("");
    } else {
      setSelectedCategory(cat);
      if (!message.includes(cat)) {
        setMessage((prev) => (prev ? `${prev}\nCategory: ${cat}` : `Category: ${cat}`));
      }
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      setError("Please fill in both email and message.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          company: company.trim() || undefined,
          phone: phone.trim() || undefined,
          message: selectedCategory ? `[Category: ${selectedCategory}]\n${message.trim()}` : message.trim(),
          lead_type: role === "general" ? "buyer" : role,
          lang: "en",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* ── LEFT COLUMN: DIRECT CHANNELS & DESK INFO (5 cols) ── */}
      <div className="lg:col-span-5 space-y-4">
        {/* Priority WhatsApp Card */}
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/20 p-5 sm:p-6 backdrop-blur-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">💬</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Desk Active
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-1.5">Direct WhatsApp Trading Desk</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Fastest for quick inquiries, sending product photos, spec sheets, or discussing active supermarket tenders.
          </p>

          <a
            href="https://wa.me/972525222291"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-lg shadow-emerald-900/30"
          >
            <span>Open WhatsApp Chat (+972 52 522 2291)</span>
            <span>&rarr;</span>
          </a>
        </div>

        {/* Email Trading Desk */}
        <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center text-lg shrink-0">
              ✉️
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Trading Desk Inquiries</p>
              <a
                href="mailto:udi@fdx.trading"
                className="text-sm font-semibold text-white hover:text-orange-400 transition-colors"
              >
                udi@fdx.trading
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/5">
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg shrink-0">
              📍
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Headquarters</p>
              <p className="text-xs text-slate-200 font-medium">
                Tel Aviv, Israel · Port Logistics: Ashdod &amp; Haifa Gateways
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/5">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center text-lg shrink-0">
              ⏱️
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Response Commitment</p>
              <p className="text-xs text-slate-200 font-medium">
                Under 24 hours personally by senior trading team
              </p>
            </div>
          </div>
        </div>

        {/* Confidentiality Trust Callout */}
        <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 text-xs text-slate-400 flex items-start gap-3">
          <span className="text-base shrink-0">🔒</span>
          <p className="leading-relaxed">
            <strong className="text-slate-300">Strict Non-Disclosure:</strong> We never share proprietary formulations,
            commercial price sheets, or private contact details publicly. All inquiries are treated with institutional confidentiality.
          </p>
        </div>
      </div>

      {/* ── RIGHT COLUMN: HIGH-IMPACT CONTACT FORM (7 cols) ── */}
      <div className="lg:col-span-7 bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {submitted ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h3 className="text-2xl font-black text-white">Inquiry Received</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Thank you for reaching out. Your request has been forwarded directly to our senior trading desk.
              We will review your specifications and reply personally within 24 hours.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://wa.me/972525222291"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                <span>💬</span>
                <span>Send WhatsApp Follow-up</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                  setSelectedCategory("");
                }}
                className="px-5 py-2.5 rounded-xl border border-white/20 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
              >
                Send Another Message
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">
                Step 1: What describes your inquiry?
              </p>
              {/* Role Switcher Pills */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "buyer", label: "🛒 I'm a Buyer", desc: "Sourcing for Israel" },
                  { key: "supplier", label: "🏭 I'm a Supplier", desc: "Exporting to Israel" },
                  { key: "general", label: "🤝 Partnership", desc: "Media / Other" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setRole(item.key as RoleType)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === item.key
                        ? "border-orange-500 bg-orange-500/10 text-white shadow-xs"
                        : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <p className={`text-xs font-bold ${role === item.key ? "text-orange-400" : "text-slate-200"}`}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Category Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Product Category of Interest <span className="font-normal text-slate-500">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      selectedCategory === cat
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Grid: Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Cohen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="david@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>
            </div>

            {/* Input Grid: Company & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Company Name <span className="font-normal text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Retail Group Ltd."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  WhatsApp / Mobile <span className="font-normal text-slate-500">(Optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+972..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-700 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>
            </div>

            {/* Message Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Message / Sourcing Specifications *
                </label>
                <button
                  type="button"
                  onClick={applyTemplate}
                  className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Insert template format &rarr;
                </button>
              </div>
              <textarea
                required
                rows={5}
                placeholder="Tell us about the products, volumes, certifications (Kosher, BRC), packaging formats, or commercial timeline..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#0d1117] border border-slate-700 focus:border-orange-500 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-xl px-3.5 py-2">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !message.trim()}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Sending to Trading Desk...</span>
              ) : (
                <>
                  <span>Send Message to Trading Desk</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              No generic replies. We review every submission personally and respond within 24h.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
