"use client";

import { useState } from "react";
import type { SupplierMatch } from "./types";
import MatchPipelineBadge from "./MatchPipelineBadge";
import MatchDetailsPanel from "./MatchDetailsPanel";
import RequestInfoModal from "./RequestInfoModal";
import ProductImage from "@/components/ProductImage";
import { countryToFlag } from "@/lib/admin/countryFlag";
import { getInitials } from "@/lib/admin/avatarPalette";
import { getPipelineStatus } from "@/lib/matches/pipelineStatus";

export interface BuyerMatchProduct {
  product_name?: string | null;
  image_url: string | null;
  description: string | null;
  category: string | null;
  certifications: string[] | null;
  kosher_types: string[] | null;
  private_label: boolean | null;
  formats: string[] | null;
}

export interface BuyerMatchSupplier {
  logo_url: string | null;
  hero_image?: string | null;
  certifications: string[] | null;
  kosher_types?: string[] | null;
  moq_units?: number | null;
  moq_description?: string | null;
  lead_time_days?: number | null;
  private_label?: boolean | null;
}

export interface BuyerMatch extends SupplierMatch {
  supplier_id: string;
  match_summary: string | null;
  buyer_interest: boolean | null;
  buyer_interest_at: string | null;
  supplier: BuyerMatchSupplier | null;
  product?: BuyerMatchProduct | null;
}

const HIGH_SCORE_THRESHOLD = 80;

const QUESTION_OPTIONS = [
  "MOQ for this product",
  "Lead time",
  "Private label availability",
  "Sample availability",
  "Pricing",
  "Other",
];

function scoreBadgeClasses(score: number): string {
  if (score >= 70) return "bg-green-500/10 text-green-300 border-green-500/20";
  if (score >= 50) return "bg-orange-500/10 text-orange-300 border-orange-500/20";
  return "bg-red-500/10 text-red-300 border-red-500/20";
}

export default function BuyerMatchCard({ match }: { match: BuyerMatch }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [interested, setInterested] = useState(!!match.buyer_interest);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [confirmInterest, setConfirmInterest] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [askOpen, setAskOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionMessage, setQuestionMessage] = useState("");
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionSent, setQuestionSent] = useState(false);

  const score = match.match_score ?? 0;
  const flag = countryToFlag(match.country);
  const companyName = match.company_name || "Supplier";
  const product = match.product ?? null;
  const pipeline = getPipelineStatus(match);
  const messagingDisabled = pipeline === "closed" || pipeline === "declined";

  const certs = Array.from(
    new Set([
      ...(match.match_breakdown?.certifications ?? []),
      ...(match.match_breakdown?.kosher_types ?? []),
      ...(product?.certifications ?? []),
      ...(product?.kosher_types ?? []),
      ...(match.supplier?.certifications ?? []),
      ...(match.supplier?.kosher_types ?? []),
    ])
  );

  const moq = match.supplier?.moq_description
    || (match.supplier?.moq_units ? `${match.supplier.moq_units.toLocaleString()} units` : null);
  const leadTime = match.supplier?.lead_time_days ? `${match.supplier.lead_time_days} days` : null;
  const privateLabel = product?.private_label ?? match.supplier?.private_label ?? null;

  const hasFactRow = !!(moq || leadTime || privateLabel !== null);

  async function handleInterested() {
    setSendingInterest(true);
    setInterestError(null);
    try {
      const res = await fetch("/api/buyer/interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, terms_accepted: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setInterested(true);
      setConfirmInterest(false);
    } catch (err) {
      setInterestError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingInterest(false);
    }
  }

  function toggleQuestion(option: string) {
    setSelectedQuestions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  async function handleSendQuestion() {
    setSendingQuestion(true);
    setQuestionError(null);
    try {
      const res = await fetch("/api/buyer/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          questions: selectedQuestions,
          message: questionMessage,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setQuestionSent(true);
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingQuestion(false);
    }
  }

  return (
    <>
      <div
        className={`dark-card p-4 sm:p-5 ${
          score > HIGH_SCORE_THRESHOLD ? "border-l-4 border-l-orange-500" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {match.supplier?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.supplier.logo_url}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                {getInitials(companyName)}
              </div>
            )}
            <h3 className="font-semibold text-white truncate">
              {flag ? `${flag} ` : ""}
              {companyName}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${scoreBadgeClasses(score)}`}>
              {score}/100
            </span>
            <MatchPipelineBadge match={match} />
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <ProductImage
            imageUrl={product?.image_url ?? null}
            categoryName={product?.category ?? null}
            productName={match.product_name || companyName}
            size={80}
          />

          <div className="min-w-0 flex-1">
            {match.product_name && (
              <h4 className="font-semibold text-white leading-snug">{match.product_name}</h4>
            )}
            {product?.description && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{product.description}</p>
            )}

            {certs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {certs.map((c) => (
                  <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">
                    {c}
                  </span>
                ))}
              </div>
            )}

            {hasFactRow && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-white/10 text-xs text-slate-400">
                {moq && <span>MOQ: {moq}</span>}
                {leadTime && <span>Lead time: {leadTime}</span>}
                {privateLabel !== null && <span>Private label: {privateLabel ? "Yes" : "No"}</span>}
              </div>
            )}
          </div>
        </div>

        {match.match_summary && (
          <p className="mt-4 pt-3 border-t border-white/10 text-sm text-slate-300 leading-relaxed">
            <span className="font-medium text-slate-200">Why this match: </span>
            {match.match_summary}
          </p>
        )}

        {interestError && <p className="mt-3 text-xs text-red-400">{interestError}</p>}

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setConfirmInterest((v) => !v)}
            disabled={interested}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-70 ${
              interested
                ? "bg-green-500/10 text-green-300 cursor-default"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
          >
            {interested ? "Interest sent ✓ We'll be in touch within 24 hours." : "I'm interested in this supplier →"}
          </button>

          {!messagingDisabled && (
            <button
              type="button"
              onClick={() => setAskOpen((v) => !v)}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition"
            >
              Ask a question
            </button>
          )}

          <button
            type="button"
            onClick={() => setInfoModalOpen(true)}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition"
          >
            Request more info
          </button>

          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="text-sm font-medium text-orange-400 hover:text-orange-300 ml-auto"
          >
            View details →
          </button>
        </div>

        {confirmInterest && !interested && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-sm font-medium text-slate-200 mb-2">
              Confirm your interest in {companyName}
            </p>
            <p className="text-sm text-slate-400 mb-2">
              By expressing interest, you acknowledge that:
            </p>
            <ul className="text-sm text-slate-400 list-disc list-inside space-y-1 mb-3">
              <li>FoodXchange will facilitate introductions</li>
              <li>
                A sourcing commission of 3% applies to any orders placed with suppliers matched via
                FoodXchange within 24 months
              </li>
              <li>FoodXchange terms of service apply</li>
            </ul>
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500"
              />
              I understand and agree to these terms
            </label>

            {interestError && <p className="text-xs text-red-400 mb-3">{interestError}</p>}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleInterested}
                disabled={!agreedToTerms || sendingInterest}
                className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {sendingInterest ? "Sending…" : "Confirm interest →"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmInterest(false)}
                disabled={sendingInterest}
                className="text-sm text-slate-400 hover:text-slate-200 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {askOpen && (
          <div className="mt-3 pt-3 border-t border-white/10">
            {questionSent ? (
              <p className="text-sm text-green-300">
                Question sent ✓ We&apos;ll get an answer from the supplier and reply via email.
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-200 mb-2">What would you like to know?</p>
                <div className="flex flex-col gap-2 mb-3">
                  {QUESTION_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(option)}
                        onChange={() => toggleQuestion(option)}
                        className="rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500"
                      />
                      {option}
                    </label>
                  ))}
                </div>

                <textarea
                  value={questionMessage}
                  onChange={(e) => setQuestionMessage(e.target.value)}
                  rows={3}
                  placeholder="Add any extra context… (optional)"
                  className="dark-input w-full resize-none mb-3"
                />

                {questionError && <p className="text-xs text-red-400 mb-3">{questionError}</p>}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendQuestion}
                    disabled={sendingQuestion || (selectedQuestions.length === 0 && !questionMessage.trim())}
                    className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {sendingQuestion ? "Sending…" : "Send question →"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAskOpen(false)}
                    disabled={sendingQuestion}
                    className="text-sm text-slate-400 hover:text-slate-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {detailsOpen && (
        <MatchDetailsPanel match={match} viewerRole="buyer" onClose={() => setDetailsOpen(false)} />
      )}
      {infoModalOpen && <RequestInfoModal matchId={match.id} onClose={() => setInfoModalOpen(false)} />}
    </>
  );
}
