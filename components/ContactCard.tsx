"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CopyButton } from "@/components/CopyButton";
import { QrCode } from "@/components/QrCode";
import type { ContactCard } from "@/lib/contactCards";

interface Props {
  card: ContactCard;
  cardUrl: string;
}

// Call window.plausible() if the script is loaded; log to console in dev.
function trackEvent(name: string, props: Record<string, string>) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Track]", name, props);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : null;
  if (w && typeof w.plausible === "function") {
    w.plausible(name, { props });
  }
}

export function ContactCard({ card, cardUrl }: Props) {
  const utmRef = useRef<Record<string, string>>({});
  const [imgError, setImgError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [lang, setLang] = useState<"en" | "he">("en");

  useEffect(() => {
    const saved = localStorage.getItem("card-lang") as "en" | "he" | null;
    if (saved === "he") setLang("he");

    const p = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    if (p.get("utm_source")) utm.utm_source = p.get("utm_source")!;
    if (p.get("utm_campaign")) utm.utm_campaign = p.get("utm_campaign")!;
    utmRef.current = utm;
    track("contact_card_viewed");
    setCanShare(typeof navigator.share === "function");

    fetch("/api/card/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: card.handle,
        persona: card.persona,
        event: "view",
        referrer: document.referrer || undefined,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHe = lang === "he";
  function toggleLang() {
    const next = isHe ? "en" : "he";
    setLang(next);
    localStorage.setItem("card-lang", next);
  }
  function t(en: string, he?: string) {
    return isHe && he ? he : en;
  }

  function track(event: string, extra: Record<string, string> = {}) {
    trackEvent(event, {
      handle: card.handle,
      persona: card.persona,
      page_path: `/c/${card.handle}`,
      ...utmRef.current,
      ...extra,
    });
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setLinkCopied(true);
    track("copy_link");
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleShare() {
    navigator.share({ title: card.name, url: window.location.href }).catch(() => {});
    track("share_card");
  }

  const initials = card.firstName[0] + card.lastName[0];
  const showPhoto = !!(card.imageUrl && !imgError);

  const btnBase =
    "min-h-[44px] rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 justify-center w-full active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";
  const btnSecondary = `${btnBase} bg-white/5 hover:bg-white/10 border border-white/10 text-white`;

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl mx-auto"
    >
      {/* ── Profile ── */}
      <div className="relative flex flex-col items-center text-center mb-8">
        <button
          onClick={toggleLang}
          className="absolute top-0 inset-e-0 text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400"
          aria-label="Toggle language"
        >
          {isHe ? "EN" : "עב"}
        </button>

        {showPhoto ? (
          <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/20 shadow-lg mb-4 shrink-0">
            <Image
              src={card.imageUrl!}
              alt={card.name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center mb-4 shrink-0 shadow-lg ring-2 ring-white/20">
            <span className="text-2xl font-black text-white select-none">{initials}</span>
          </div>
        )}
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          {t(card.name, card.nameHe)}
        </h1>
        <p className="text-sm text-orange-400 font-semibold mt-1">
          {t(card.title, card.titleHe)}
        </p>
        <p className="text-sm text-slate-400">{card.company}</p>
        <p className="text-sm text-slate-300 leading-relaxed mt-3 max-w-[240px]">
          {t(card.tagline, card.taglineHe)}
        </p>

        {card.pitch && (
          <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3 w-full max-w-70">
            <p className="text-xs text-slate-400 leading-relaxed text-start">
              {t(card.pitch, card.pitchHe)}
            </p>
          </div>
        )}
      </div>

      {/* ── WhatsApp flows ── */}
      <div className="mb-6">
        <p className="text-xs text-slate-500 text-center mb-3 leading-relaxed">
          {isHe
            ? "בחרו הודעה שמתאימה לכם — כך נוכל לענות מהר יותר."
            : "Choose a message that matches you — it helps us respond faster."}
        </p>
        <div className="space-y-2">
          {card.ctaButtons.map((btn) => {
            const waMsg = t(btn.waMessage, btn.waMessageHe);
            const waUrl = `https://wa.me/${card.whatsapp}?text=${encodeURIComponent(waMsg)}`;
            const bgClass =
              btn.audience === "buyer"
                ? "bg-green-600 hover:bg-green-500"
                : btn.audience === "supplier"
                ? "bg-green-800 hover:bg-green-700"
                : "bg-green-700 hover:bg-green-600";
            return (
              <a
                key={btn.audience + btn.label}
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open WhatsApp as ${btn.audience}`}
                onClick={() =>
                  track("contact_card_whatsapp_clicked", {
                    audience: btn.audience,
                    source: "button",
                  })
                }
                className={`${btnBase} ${bgClass} text-white`}
              >
                <WhatsAppIcon /> {t(btn.label, btn.labelHe)}
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Active sourcing strip ── */}
      {card.currentlySourcing && card.currentlySourcing.length > 0 && (
        <div
          className="mb-6 rounded-xl px-4 py-3"
          style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.2)",
          }}
        >
          <p className="text-xs font-semibold text-orange-400 mb-2">
            {isHe ? "כרגע מחפש:" : "Currently sourcing:"}
          </p>
          <ul className="space-y-1">
            {(isHe
              ? (card.currentlySourcingHe ?? card.currentlySourcing)
              : card.currentlySourcing
            ).map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Other actions ── */}
      <div className="space-y-2 mb-6">
        <a
          href={`mailto:${card.email}`}
          aria-label={`Email ${card.name}`}
          onClick={() => track("contact_card_email_clicked", { source: "button" })}
          className={btnSecondary}
        >
          <EmailIcon /> {isHe ? "אימייל" : "Email"}
        </a>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={card.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit website"
            onClick={() => track("contact_card_website_clicked", { source: "button" })}
            className={`${btnSecondary} w-auto`}
          >
            {isHe ? "אתר" : "Website"}
          </a>
          {card.linkedin && (
            <a
              href={card.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View LinkedIn profile"
              onClick={() => track("contact_card_linkedin_clicked", { source: "button" })}
              className={`${btnSecondary} w-auto`}
            >
              LinkedIn
            </a>
          )}
        </div>

        <a
          href={`/api/vcard/${card.handle}`}
          download={`${card.firstName}-${card.lastName}.vcf`}
          aria-label="Download contact card"
          onClick={() =>
            track("contact_card_vcard_download_clicked", { source: "button" })
          }
          className={`${btnBase} bg-orange-500 hover:bg-orange-600 text-white`}
        >
          {isHe ? "שמור איש קשר" : "Save Contact"}
        </a>
      </div>

      {/* ── Copy row ── */}
      <div className="border border-white/10 rounded-2xl divide-y divide-white/10 mb-8">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-slate-500">{isHe ? "דוא״ל" : "Email"}</span>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-slate-300 truncate">{card.email}</span>
            <CopyButton
              text={card.email}
              label="email"
              onCopied={() => track("contact_card_copy_clicked", { field: "email" })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-slate-500">{isHe ? "טלפון" : "Phone"}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">{card.phone}</span>
            <CopyButton
              text={card.phone}
              label="phone"
              onCopied={() => track("contact_card_copy_clicked", { field: "phone" })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-slate-500">{isHe ? "קישור" : "Link"}</span>
          <CopyButton
            text={cardUrl}
            label="link"
            onCopied={() => track("contact_card_copy_clicked", { field: "link" })}
          />
        </div>
      </div>

      {/* ── QR Code ── */}
      <div className="flex flex-col items-center gap-3">
        <QrCode
          url={cardUrl}
          size={164}
          onRendered={() => track("contact_card_qr_rendered")}
        />
        <p className="text-xs text-slate-600">
          {isHe ? "סרקו לפתיחת הכרטיס" : "Scan to open this card"}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleCopyLink}
            aria-label="Copy card link"
            className="text-xs text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400 rounded"
          >
            {linkCopied ? (isHe ? "הועתק!" : "Copied!") : (isHe ? "העתק קישור" : "Copy link")}
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              aria-label="Share this card"
              className="text-xs text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400 rounded"
            >
              {isHe ? "שתף" : "Share"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0 fill-current"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}
