"use client";

import React, { useState } from "react";
import type { TrackedSampleKit } from "@/app/api/track/lookup/route";

interface SensoryScorecardSectionProps {
  kit: TrackedSampleKit;
  lang?: "he" | "en";
  onFeedbackSubmitted?: () => void;
}

export default function SensoryScorecardSection({
  kit,
  lang = "he",
  onFeedbackSubmitted,
}: SensoryScorecardSectionProps) {
  const isHe = lang === "he";

  const [taste, setTaste] = useState<number>(kit.sensory_scores?.taste || 5);
  const [texture, setTexture] = useState<number>(kit.sensory_scores?.texture || 5);
  const [packaging, setPackaging] = useState<number>(kit.sensory_scores?.packaging || 5);
  const [viability, setViability] = useState<number>(kit.sensory_scores?.viability || 5);
  const [comments, setComments] = useState<string>(kit.buyer_tasting_feedback || "");
  const [decision, setDecision] = useState<"approved" | "rejected" | "more_samples">("approved");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(
    Boolean(kit.sensory_scores && kit.buyer_tasting_feedback)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const avg = Number(((taste + texture + packaging + viability) / 4).toFixed(1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/track/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_code: kit.tracking_code,
          decision,
          buyer_tasting_feedback: comments,
          sensory_scores: {
            taste,
            texture,
            packaging,
            viability,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmittedSuccess(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isHe
          ? "שגיאה בשליחת המשוב. אנא נסו שוב."
          : "Error submitting feedback. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    hint: string
  ) => {
    return (
      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">{label}</span>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
            {value} / 5
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">{hint}</p>

        {submittedSuccess ? (
          <div className="flex gap-1 text-lg text-amber-400 pt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s}>{s <= value ? "★" : "☆"}</span>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 pt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => onChange(star)}
                className={`w-9 h-9 rounded-xl font-bold text-base flex items-center justify-center transition ${
                  star <= value
                    ? "bg-amber-500 text-slate-950 scale-105 shadow-md shadow-amber-500/30"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⭐️</span>
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
              {isHe ? "שולחן הטעימות והערכת איכות" : "Sensory Quality Scorecard"}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {isHe ? "משוב אורגנולפטי והחלטת רכש" : "Organoleptic Tasting & Procurement Decision"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isHe
              ? "דירוג הדוגמאות מועבר ישירות לדסק העסקאות (Deal Desk) של FoodXchange לקידום הצעת מחיר מסחרית, בדיקת כמויות מינימום (MOQ) ותנאי תשלום מול המפעל."
              : "Your sensory evaluation is routed directly to the FoodXchange Deal Desk to formulate commercial container terms and factory pricing."}
          </p>
        </div>

        {/* Average Score Badge */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center shrink-0 min-w-[120px]">
          <span className="text-[11px] uppercase font-bold text-amber-400 block tracking-wider">
            {isHe ? "ציון משוקלל" : "Overall Score"}
          </span>
          <span className="text-3xl font-black text-amber-400 font-mono">
            {kit.sensory_scores?.overall || avg}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isHe ? "מתוך 5.0" : "out of 5.0"}
          </span>
        </div>
      </div>

      {submittedSuccess ? (
        /* ALREADY SUBMITTED VIEW */
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-2xl flex items-center justify-center mx-auto">
            ✓
          </div>
          <h4 className="text-lg font-bold text-white">
            {isHe ? "משוב הטעימות עודכן ונשלח לדסק העסקאות!" : "Sensory Feedback Submitted!"}
          </h4>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {isHe
              ? `הערכת האיכות התקבלה ונשמרה עבור ערכה #${kit.tracking_code}. צוות FoodXchange מגבש עבורכם את הצעת המחיר המסחרית למכולה.`
              : `Your sensory scorecard is logged for kit #${kit.tracking_code}. The Deal Desk is preparing your commercial quotation.`}
          </p>
          {kit.buyer_tasting_feedback && (
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 italic text-right md:text-center max-w-lg mx-auto">
              "{kit.buyer_tasting_feedback}"
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE FORM VIEW */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 4 Dimension Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderStars(
              isHe ? "טעם וארומה" : "Flavor & Scent",
              taste,
              setTaste,
              isHe
                ? "עוצמת הטעמים, אותנטיות, איזון חומציות/מתיקות"
                : "Richness, authentic European profile, flavor balance"
            )}

            {renderStars(
              isHe ? "מרקם וחוויית אכילה" : "Texture & Mouthfeel",
              texture,
              setTexture,
              isHe
                ? "אל-דנטה בפסטה, סמיכות ברטבים, פריכות בוופלים"
                : "Al dente bite, sauce viscosity, wafer crispness"
            )}

            {renderStars(
              isHe ? "אריזה ומשקל מסונן" : "Packaging & Weight",
              packaging,
              setPackaging,
              isHe
                ? "איטום, תווית, עמידות בשינוע, משקל נקי ומסונן"
                : "Seal integrity, shelf presentation, net drained weight"
            )}

            {renderStars(
              isHe ? "התאמה למדף הרשת" : "Retail Viability",
              viability,
              setViability,
              isHe
                ? "משיכת עין לצרכן הישראלי, פוטנציאל מרווח גולמי"
                : "Appeal to Israeli consumers, gross margin upside"
            )}
          </div>

          {/* Decision Selector */}
          <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-white block">
              {isHe ? "החלטת הקניין / ועדת הטעימות:" : "Buyer Tasting Decision:"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  decision === "approved"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="tasting_decision"
                  value="approved"
                  checked={decision === "approved"}
                  onChange={() => setDecision("approved")}
                  className="accent-emerald-500"
                />
                <span className="text-xs font-bold">
                  {isHe ? "✅ מאושר - להנפיק הצעת מחיר למכולה" : "✅ Approved - Issue Container Quote"}
                </span>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  decision === "more_samples"
                    ? "bg-amber-500/10 border-amber-500/50 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="tasting_decision"
                  value="more_samples"
                  checked={decision === "more_samples"}
                  onChange={() => setDecision("more_samples")}
                  className="accent-amber-500"
                />
                <span className="text-xs font-bold">
                  {isHe ? "🔄 דרוש דיוק פורמט / דוגמה נוספת" : "🔄 Needs Revision / Alternate Sample"}
                </span>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  decision === "rejected"
                    ? "bg-red-500/10 border-red-500/50 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="tasting_decision"
                  value="rejected"
                  checked={decision === "rejected"}
                  onChange={() => setDecision("rejected")}
                  className="accent-red-500"
                />
                <span className="text-xs font-bold">
                  {isHe ? "❌ אינו עומד בציפיות הרשת" : "❌ Rejected - Does Not Meet Standard"}
                </span>
              </label>
            </div>
          </div>

          {/* Comments Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 block">
              {isHe
                ? "הערות מילוליות משולחן הטעימות (אופציונלי):"
                : "Tasting notes and comments for the factory (optional):"}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder={
                isHe
                  ? "למשל: רמת מליחות מצוינת, מרקם מעולה, מועדף אריזת 500 גרם במקום 250 גרם..."
                  : "e.g. Excellent mouthfeel, packaging passed inspection, interested in 500g format..."
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-xs text-slate-400">
              {isHe
                ? "שליחת המשוב תעדכן מיד את דסק ה-Deal Desk של FoodXchange."
                : "Submitting directly informs FoodXchange Deal Desk."}
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{isHe ? "מעדכן משוב..." : "Submitting..."}</span>
                </>
              ) : (
                <>
                  <span>📝</span>
                  <span>{isHe ? "שמור ושלח משוב טעימות לדסק ←" : "Submit Tasting Scorecard ←"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
