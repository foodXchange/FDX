"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  CHASER_TEMPLATES,
  detectSupplierLanguage,
  evaluateFollowUpUrgency,
  type ChaserLanguage,
  type ChaserRound,
} from "@/lib/outreach/chaserTemplates";
import { renderTemplate } from "@/lib/outreach/renderTemplate";
import { getMatchRefTag } from "@/lib/notifications/gmailHelper";
import { sendSupplierFollowUp } from "@/app/admin/requests/actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  match: {
    id: string;
    company_name: string | null;
    product_name: string | null;
    country: string | null;
    match_score: number;
    sent_at: string | null;
    status: string;
    match_breakdown: Record<string, any> | null;
  };
  contact?: {
    email: string | null;
    phone: string | null;
  };
  specsSummary?: string;
  onSuccess?: () => void;
}

export default function SupplierChaserModal({
  isOpen,
  onClose,
  requestId,
  match,
  contact,
  specsSummary = "Standard export specifications, Kosher preferred",
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");

  const assessment = evaluateFollowUpUrgency(match);
  const [round, setRound] = useState<ChaserRound>(assessment.recommendedRound || 1);
  const [language, setLanguage] = useState<ChaserLanguage>(
    detectSupplierLanguage(match.country)
  );

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync templates when round, language, or channel changes
  useEffect(() => {
    const template = CHASER_TEMPLATES[round]?.[language] ?? CHASER_TEMPLATES[1].en;
    const refTag = getMatchRefTag(match.id);
    const vars: Record<string, string> = {
      company_name: match.company_name ?? "Supplier Team",
      product_name: match.product_name ?? "food products",
      buyer_product: match.product_name ?? "requested item",
      category: "Food & Beverage",
      specs_summary: specsSummary,
      country: match.country ?? "",
      match_score: String(match.match_score),
      ref_tag: refTag,
    };

    setSubject(renderTemplate(template.subject, vars));
    setMessage(
      renderTemplate(channel === "whatsapp" ? template.whatsAppText : template.body, vars)
    );
  }, [round, language, channel, match, specsSummary]);

  if (!isOpen) return null;

  const previousFollowUps: Array<{
    date: string;
    channel: string;
    round: number;
    language: string;
  }> = Array.isArray(match.match_breakdown?.follow_ups)
    ? match.match_breakdown!.follow_ups
    : [];

  const handleSend = () => {
    setErrorMsg(null);
    setSuccessNotice(null);

    startTransition(async () => {
      const res = await sendSupplierFollowUp({
        matchId: match.id,
        requestId,
        channel,
        language,
        round,
        customSubject: channel === "email" ? subject : undefined,
        customMessage: message,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Failed to send follow-up");
        return;
      }

      if (channel === "whatsapp" && res.waUrl) {
        window.open(res.waUrl, "_blank");
      }

      setSuccessNotice(
        channel === "email"
          ? `✓ Follow-Up Round ${round} sent via ${res.via === "gmail" ? "Gmail SMTP" : "Resend"} to ${contact?.email ?? match.company_name}!`
          : `✓ WhatsApp chaser recorded & opened!`
      );

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {language === "es" ? "🇪🇸" : language === "it" ? "🇮🇹" : "🇬🇧"}
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Supplier Chaser: {match.company_name}
              </h3>
              <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                {match.country || "Global"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Product: <strong className="text-slate-700">{match.product_name}</strong> · Match Score {match.match_score}/100
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {/* Status & Cadence Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⏰</span>
              <div>
                <p className="font-bold text-amber-900 text-xs">
                  {assessment.badgeText || "RFQ Sent · Awaiting Response"}
                </p>
                <p className="text-[11px] text-amber-700">
                  {previousFollowUps.length === 0
                    ? `Initial RFQ sent ${assessment.daysElapsed} days ago. No response received yet.`
                    : `${previousFollowUps.length} reminder(s) already logged. Last touch: ${
                        assessment.lastFollowUpAt
                          ? new Date(assessment.lastFollowUpAt).toLocaleDateString("en-GB")
                          : "recent"
                      }.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                Recommended: Round {assessment.recommendedRound}
              </span>
            </div>
          </div>

          {/* Controls: Round, Language, Channel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Round Selector */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                Chaser Urgency Round
              </label>
              <div className="flex flex-col gap-1">
                {(
                  [
                    { r: 1, label: "Round 1: Gentle Bump (>48h)" },
                    { r: 2, label: "Round 2: Shortlist Final (>96h)" },
                    { r: 3, label: "Round 3: Tender Closing" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.r}
                    type="button"
                    onClick={() => setRound(opt.r)}
                    className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition ${
                      round === opt.r
                        ? "bg-orange-50 border-orange-400 font-bold text-orange-900 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                Outreach Language
              </label>
              <div className="flex flex-col gap-1">
                {(
                  [
                    { code: "en" as const, flag: "🇬🇧", name: "English" },
                    { code: "es" as const, flag: "🇪🇸", name: "Spanish (España)" },
                    { code: "it" as const, flag: "🇮🇹", name: "Italian (Italia)" },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`text-left text-xs px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition ${
                      language === lang.code
                        ? "bg-blue-50 border-blue-400 font-bold text-blue-900 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      {lang.flag} {lang.name}
                    </span>
                    {detectSupplierLanguage(match.country) === lang.code && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                        Auto
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Channel */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                Channel
              </label>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`text-left text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 transition ${
                    channel === "email"
                      ? "bg-slate-900 border-slate-900 text-white font-bold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>📧</span>
                  <div>
                    <p className="leading-tight">Direct Email</p>
                    <p className="text-[10px] opacity-75">
                      {contact?.email ? contact.email : "No email on file"}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("whatsapp")}
                  className={`text-left text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 transition ${
                    channel === "whatsapp"
                      ? "bg-green-600 border-green-600 text-white font-bold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>💬</span>
                  <div>
                    <p className="leading-tight">WhatsApp Bump</p>
                    <p className="text-[10px] opacity-75">
                      {contact?.phone ? contact.phone : "Direct web chat"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Email Subject (if email) */}
          {channel === "email" && (
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {/* Message Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                {channel === "email" ? "Email Body (Threads into previous message)" : "WhatsApp Message"}
              </label>
              <span className="text-[10px] text-slate-400">
                Variables auto-injected: Buyer Specs, Catalog Item & Ref Code
              </span>
            </div>
            <textarea
              rows={channel === "email" ? 7 : 4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Error & Success States */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              {successNotice}
            </div>
          )}

          {/* Previous History Timeline (if any) */}
          {previousFollowUps.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Reminder Audit Log
              </p>
              <div className="space-y-1">
                {previousFollowUps.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-slate-600"
                  >
                    <span>
                      {f.channel === "email" ? "📧 Email" : "💬 WhatsApp"} Round {f.round} ({f.language?.toUpperCase()})
                    </span>
                    <span className="text-slate-400">
                      {new Date(f.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || (channel === "email" && !contact?.email)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            {isPending ? (
              <span>Sending Chaser…</span>
            ) : channel === "email" ? (
              <span>🚀 Send Follow-Up Bump</span>
            ) : (
              <span>💬 Open WhatsApp Chaser</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
