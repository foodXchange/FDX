"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CopyButton } from "@/components/CopyButton";
import { QrCode } from "@/components/QrCode";
import { SourcingInquiryDrawer } from "./SourcingInquiryDrawer";
import { CallSchedulerModal } from "./CallSchedulerModal";

export interface CardViewPhoto {
  src: string;
  alt: string;
  caption?: string;
  offsetX?: number;
  offsetY?: number;
}

export interface CardViewData {
  handle: string;
  name: string;
  nameHe?: string;
  title: string;
  titleHe?: string;
  company: string;
  tagline: string;
  taglineHe?: string;
  pitch?: string;
  pitchHe?: string;
  email: string;
  phone: string;
  /** Raw phone digits for wa.me URL (e.g. "972525222291") */
  whatsappBuyer: string;
  whatsappManufacturer: string;
  website: string;
  linkedin?: string;
  photos: CardViewPhoto[];
  activeSourcing: string[];
  activeSourcingHe?: string[];
}

interface CardViewProps {
  card: CardViewData;
  cardUrl: string;
  /** true = no analytics tracking, WhatsApp buttons are non-functional */
  preview?: boolean;
  initialLang?: "en" | "he";
}

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

export function CardView({ card, cardUrl, preview = false, initialLang }: CardViewProps) {
  const [lang, setLang] = useState<"en" | "he">(initialLang || "en");
  const [linkCopied, setLinkCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [inquiryDrawerOpen, setInquiryDrawerOpen] = useState(false);
  const [schedulerModalOpen, setSchedulerModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Auto-detect Hebrew browser language if no explicit initialLang passed via URL
  useEffect(() => {
    if (!initialLang && typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("he")) {
      setLang("he");
    }
  }, [initialLang]);

  function switchLang(newLang: "en" | "he") {
    setLang(newLang);
    track("switch_language", { lang: newLang });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newLang === "he") {
        url.searchParams.set("lang", "he");
      } else {
        url.searchParams.delete("lang");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  useEffect(() => {
    if (!preview) {
      fetch("/api/card/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: card.handle,
          persona: "default",
          event: "view",
          referrer: document.referrer || undefined,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxOpen(false);
        setEmailModalOpen(false);
        setInquiryDrawerOpen(false);
        setSchedulerModalOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmail.trim() || !formMessage.trim()) {
      setFormError("Please provide your email and a message.");
      return;
    }
    setFormStatus("sending");
    setFormError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim() || undefined,
          email: formEmail.trim(),
          company: formCompany.trim() || undefined,
          message: formMessage.trim(),
          lead_type: `business_card_${card.handle}`,
          lang: lang,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message. Please try again.");
      }

      setFormStatus("success");
      track("contact_card_email_sent", { handle: card.handle });
    } catch (err: any) {
      setFormStatus("error");
      setFormError(err?.message || "Something went wrong. Please try again.");
    }
  }

  function track(event: string, extra: Record<string, string> = {}) {
    if (preview) return;
    trackEvent(event, { handle: card.handle, page_path: `/business-card/${card.handle}`, ...extra });

    // Also persist telemetry to /api/card/track so the database records conversions
    fetch("/api/card/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: card.handle,
        persona: extra.audience || "default",
        event,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
    }).catch(() => {});
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setLinkCopied(true);
    track("copy_link");
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleShare() {
    const base = cardUrl || "https://fdx.trading/business-card/udi";
    const shareUrl = `${base}${lang === "he" ? "?lang=he" : ""}`;
    const shareData = {
      title: lang === "he" ? `${card.nameHe || card.name} — FoodXchange` : `${card.name} — FoodXchange`,
      text: lang === "he"
        ? (card.taglineHe || "מחברים יצרני מזון אירופאים עם רשתות השיווק בישראל.")
        : (card.tagline || "Connecting European manufacturers with the Israeli food market."),
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        track("share_card", { lang });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track("share_card", { lang });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(lang === "he" ? "העתק קישור זה:" : "Copy this link:", shareUrl);
    }
  }

  const photos = card.photos;
  const hasGallery = photos.length >= 2;

  const btnBase =
    "min-h-[44px] rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 justify-center w-full active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";
  const btnSecondary = `${btnBase} bg-white/5 hover:bg-white/10 border border-white/10 text-white`;

  const buyerWaMsgEn = "Hi Udi, I'm a food buyer in Israel. I saw your contact card and want to discuss sourcing European products.";
  const buyerWaMsgHe = "שלום אודי, אני קניין/יבואן מזון בישראל. ראיתי את כרטיס הביקור שלך ורוצה לבדוק אפשרויות רכש מול יצרנים באירופה.";
  const buyerWaMsg = lang === "he" ? buyerWaMsgHe : buyerWaMsgEn;

  const mfgWaMsgEn = "Hi Udi, I'm a European food manufacturer/exporter. I want to explore entering the Israeli market through FoodXchange.";
  const mfgWaMsgHe = "שלום אודי, אני יצרן/יצואן מזון מאירופה ורוצה לבדוק כניסה לשוק הישראלי באמצעות FoodXchange.";
  const mfgWaMsg = lang === "he" ? mfgWaMsgHe : mfgWaMsgEn;
  const buyerNum = card.whatsappBuyer.replace(/^\+/, "");
  const mfgNum = card.whatsappManufacturer.replace(/^\+/, "");

  const displayName = lang === "he" && card.nameHe ? card.nameHe : card.name;
  const displayTitle = lang === "he" && card.titleHe ? card.titleHe : card.title;
  const displayTagline = lang === "he" && card.taglineHe ? card.taglineHe : card.tagline;
  const displayPitch = lang === "he" && card.pitchHe ? card.pitchHe : card.pitch;
  const displaySourcing =
    lang === "he" && card.activeSourcingHe && card.activeSourcingHe.length > 0
      ? card.activeSourcingHe
      : card.activeSourcing;

  return (
    <div
      dir={lang === "he" ? "rtl" : "ltr"}
      className="bg-[#1B2A4A] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl mx-auto transition-all duration-200"
    >
      {/* ── Top Bar: Badge & Bilingual Switcher ── */}
      <div className="flex items-center justify-between w-full mb-5">
        <span className="text-[10px] font-extrabold tracking-wider text-orange-400 uppercase bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
          FoodXchange ID
        </span>

        <div className="inline-flex rounded-xl border border-white/10 bg-slate-900/80 p-0.5 text-xs font-bold" dir="ltr">
          <button
            type="button"
            onClick={() => switchLang("en")}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              lang === "en" ? "bg-orange-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => switchLang("he")}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              lang === "he" ? "bg-orange-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
            }`}
          >
            עב
          </button>
        </div>
      </div>

      {/* ── Profile ── */}
      <div className="relative flex flex-col items-center text-center mb-6">
        {hasGallery ? (
          <div className="w-full mb-4">
            {/* Main photo */}
            <div
              className="w-32 h-32 mx-auto overflow-hidden rounded-full ring-2 ring-white/20 shadow-lg"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(dx) > 50) {
                  if (dx < 0) setActivePhoto((prev) => (prev + 1) % photos.length);
                  else setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
                }
              }}
            >
              {photos.map((photo, index) => {
                const ox = photo.offsetX ?? 0;
                const oy = photo.offsetY ?? 0;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.src}
                    src={photo.src}
                    alt={photo.alt}
                    className="rounded-full object-cover w-32 h-32"
                    style={{
                      display: index === activePhoto ? "block" : "none",
                      objectPosition: `calc(50% + ${ox}px) calc(0% + ${oy}px)`,
                      cursor: "pointer",
                    }}
                    onClick={() => setLightboxOpen(true)}
                  />
                );
              })}
            </div>

            {/* Thumbnail strip */}
            <div className="flex justify-center gap-2 mt-3">
              {photos.map((ph, i) => (
                <button
                  key={ph.src}
                  onClick={() => setActivePhoto(i)}
                  className="shrink-0 rounded-md overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400"
                  style={{
                    width: 52,
                    height: 52,
                    border: i === activePhoto ? "2px solid #F47920" : "2px solid transparent",
                    opacity: i === activePhoto ? 1 : 0.6,
                    transform: i === activePhoto ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.15s",
                  }}
                  aria-label={ph.alt}
                >
                  <Image
                    src={ph.src}
                    alt={ph.alt}
                    width={52}
                    height={52}
                    className="rounded-md border border-white/10 object-cover cursor-pointer hover:opacity-80 transition-opacity w-full h-full"
                  />
                </button>
              ))}
            </div>

            {/* Caption */}
            {photos[activePhoto].caption && (
              <p className="text-center mt-1.5" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                {photos[activePhoto].caption}
              </p>
            )}
          </div>
        ) : photos.length === 1 ? (
          <div
            className="w-32 h-32 rounded-full overflow-hidden ring-2 ring-white/20 shadow-lg mb-4 shrink-0 cursor-pointer mx-auto"
            onClick={() => setLightboxOpen(true)}
          >
            <Image src={photos[0].src} alt={photos[0].alt} width={128} height={128} className="rounded-full object-cover w-32 h-32" />
          </div>
        ) : null}

        <h1 className="text-2xl font-semibold text-white tracking-tight">{displayName}</h1>
        <p className="text-[#F47920] font-semibold text-sm tracking-wide mt-1">{displayTitle}</p>
        <Image
          src="/logo-dark.svg"
          alt="FoodXchange"
          width={140}
          height={32}
          className="mx-auto mt-1"
        />
        <p className="text-base font-medium text-white/90 text-center leading-snug mt-3 max-w-60">{displayTagline}</p>

        {/* ── Trust Credibility Badges ── */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 mb-1">
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium flex items-center gap-1">
            <span>🛡️</span>
            <span>{lang === "he" ? "600+ יצרנים באירופה" : "600+ EU Factories"}</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium flex items-center gap-1">
            <span>🇮🇱</span>
            <span>{lang === "he" ? "רשתות שיווק בישראל" : "Israeli Retail Desk"}</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium flex items-center gap-1">
            <span>✡</span>
            <span>{lang === "he" ? "כשרות רבנות ובד״ץ" : "Kosher Oversight"}</span>
          </span>
        </div>

        {displayPitch && (
          <div className="mt-3.5 rounded-xl bg-white/5 border border-white/10 px-4 py-3 w-full max-w-70">
            <p className="text-xs text-slate-300 leading-relaxed text-start">{displayPitch}</p>
          </div>
        )}
      </div>

      {/* ── Primary CTAs: Save Contact & Book 15-Min Call ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
        <a
          href={`/api/vcard/${card.handle}${lang === "he" ? "?lang=he" : ""}`}
          download
          onClick={() => track("contact_card_vcard_download_clicked", { lang })}
          className="w-full bg-[#F47920] hover:bg-[#d96810] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/25 text-xs sm:text-sm"
        >
          <UserPlusIcon /> {lang === "he" ? "שמור איש קשר" : "Save Contact"}
        </a>
        <button
          type="button"
          onClick={() => {
            setSchedulerModalOpen(true);
            track("contact_card_call_modal_opened");
          }}
          className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-600/20 text-xs sm:text-sm"
        >
          <span>📅</span> {lang === "he" ? "שיחת היכרות (15 דק׳)" : "Book 15-Min Call"}
        </button>
      </div>

      {/* ── WhatsApp CTAs ── */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 text-center mb-3 leading-relaxed">
          {lang === "he"
            ? "בחר את ההודעה המתאימה לך — זה עוזר לנו להגיב מהר יותר:"
            : "Choose a message that matches you — it helps us respond faster."}
        </p>
        <div className="space-y-2">
          {preview ? (
            <>
              <div className={`${btnBase} bg-[#1DA851] text-white opacity-60 cursor-default`}>
                <WhatsAppIcon /> WhatsApp — I&apos;m a Buyer
              </div>
              <div className={`${btnBase} bg-[#1DA851] text-white opacity-60 cursor-default`}>
                <WhatsAppIcon /> WhatsApp — I&apos;m a Manufacturer
              </div>
            </>
          ) : (
            <>
              <a
                href={`https://wa.me/${buyerNum}?text=${encodeURIComponent(buyerWaMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("contact_card_whatsapp_clicked", { audience: "buyer" })}
                className={`${btnBase} bg-[#1DA851] hover:bg-[#189a47] text-white shadow-md shadow-emerald-600/20`}
              >
                <WhatsAppIcon /> {lang === "he" ? "וואטסאפ — אני קניין מזון בישראל" : "WhatsApp — I'm a Buyer"}
              </a>
              <a
                href={`https://wa.me/${mfgNum}?text=${encodeURIComponent(mfgWaMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("contact_card_whatsapp_clicked", { audience: "supplier" })}
                className={`${btnBase} bg-[#1DA851] hover:bg-[#189a47] text-white shadow-md shadow-emerald-600/20`}
              >
                <WhatsAppIcon /> {lang === "he" ? "וואטסאפ — אני יצרן / יצואן אירופאי" : "WhatsApp — I'm a Manufacturer"}
              </a>
            </>
          )}
        </div>
      </div>

      {/* ── Active sourcing ── */}
      {displaySourcing.length > 0 && (
        <div
          className="mb-6 rounded-xl px-4 py-3.5"
          style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
        >
          <p className="text-xs font-bold text-[#F47920] mb-2 flex items-center gap-1.5">
            <span>⚡</span>
            <span>{lang === "he" ? "רכש פעיל כעת בישראל:" : "Currently sourcing:"}</span>
          </p>
          <ul className="space-y-1.5">
            {displaySourcing.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F47920] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3.5 pt-3 border-t border-orange-500/20">
            <button
              type="button"
              onClick={() => {
                setInquiryDrawerOpen(true);
                track("contact_card_inquiry_opened");
              }}
              className="w-full bg-[#F47920]/15 hover:bg-[#F47920]/25 text-orange-300 hover:text-white border border-orange-500/30 font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs"
            >
              <span>⚡</span>
              <span>{lang === "he" ? "הגש בקשת רכש מהירה (RFQ)" : "Submit Sourcing Inquiry (RFQ)"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Other actions ── */}
      <div className="space-y-2 mb-6">
        <button
          type="button"
          onClick={() => {
            setEmailModalOpen(true);
            setFormStatus("idle");
            setFormError("");
            track("contact_card_email_clicked");
          }}
          className={btnSecondary}
        >
          <EmailIcon /> Email
        </button>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={card.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("contact_card_website_clicked")}
            className={`${btnSecondary} w-auto`}
          >
            Website
          </a>
          {card.linkedin && (
            <a
              href={card.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("contact_card_linkedin_clicked")}
              className={`${btnSecondary} w-auto`}
            >
              LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* ── Copy row ── */}
      <div className="border border-white/10 rounded-2xl divide-y divide-white/10 mb-8">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-slate-500">Email</span>
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
          <span className="text-xs text-slate-500">Phone</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">{card.phone}</span>
            <CopyButton
              text={card.phone}
              label="phone"
              onCopied={() => track("contact_card_copy_clicked", { field: "phone" })}
            />
          </div>
        </div>
      </div>

      {/* ── QR Code ── */}
      <div className="flex flex-col items-center gap-3">
        <QrCode
          url={`${cardUrl || `https://fdx.trading/business-card/${card.handle}`}${lang === "he" ? "?lang=he" : ""}`}
          size={164}
          onRendered={() => track("contact_card_qr_rendered")}
        />
        <p className="text-xs text-slate-400">
          {lang === "he" ? "סרוק לשמירת כרטיס זה בנייד" : "Scan to open this card on your phone"}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleCopyLink}
            className="text-xs text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400 rounded"
          >
            {linkCopied ? (lang === "he" ? "הועתק!" : "Copied!") : (lang === "he" ? "העתק קישור" : "Copy link")}
          </button>
          <button
            onClick={handleShare}
            className="text-xs text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400 rounded"
          >
            {copied ? (lang === "he" ? "✓ הקישור הועתק!" : "✓ Link copied!") : (lang === "he" ? "שתף כרטיס" : "Share")}
          </button>
        </div>
        <div className="flex gap-3 justify-center mt-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              lang === "he"
                ? `אודי סטריק — FoodXchange: ${cardUrl || "https://fdx.trading/business-card/udi"}?lang=he`
                : `Udi Stryk — FoodXchange: ${cardUrl || "https://fdx.trading/business-card/udi"}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(
              lang === "he" ? "כרטיס ביקור — אודי סטריק (FoodXchange)" : "FoodXchange — Udi Stryk"
            )}&body=${encodeURIComponent(
              `${cardUrl || "https://fdx.trading/business-card/udi"}${lang === "he" ? "?lang=he" : ""}`
            )}`}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Email
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
              `${cardUrl || "https://fdx.trading/business-card/udi"}${lang === "he" ? "?lang=he" : ""}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.95)", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false); }}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const dy = e.changedTouches[0].clientY - touchStartY.current;
            if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
              setLightboxOpen(false);
            } else if (Math.abs(dx) > 50) {
              if (dx < 0) setActivePhoto((prev) => (prev + 1) % photos.length);
              else setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length);
            }
          }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, fontSize: 24, background: "rgba(255,255,255,0.15)" }}
            aria-label="Close"
          >
            ×
          </button>
          {photos.length > 1 && (
            <button
              onClick={() => setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length)}
              className="absolute left-4 text-white flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, fontSize: 22, background: "rgba(255,255,255,0.15)", top: "50%", transform: "translateY(-50%)" }}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          <div className="flex flex-col items-center px-16" style={{ maxWidth: "100vw" }}>
            <Image
              src={photos[activePhoto].src}
              alt={photos[activePhoto].alt}
              width={800}
              height={600}
              className="rounded-lg object-contain"
              style={{ maxWidth: "100vw", maxHeight: "85vh" }}
            />
            {photos[activePhoto].caption && (
              <p className="text-white text-center mt-3" style={{ fontSize: 13 }}>
                {photos[activePhoto].caption}
              </p>
            )}
          </div>
          {photos.length > 1 && (
            <button
              onClick={() => setActivePhoto((prev) => (prev + 1) % photos.length)}
              className="absolute right-4 text-white flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, fontSize: 22, background: "rgba(255,255,255,0.15)", top: "50%", transform: "translateY(-50%)" }}
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </div>
      )}

      {/* ── Email Modal ── */}
      {emailModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmailModalOpen(false);
          }}
        >
          <div className="bg-[#1B2A4A] border border-white/10 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <button
              type="button"
              onClick={() => setEmailModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl p-1"
              aria-label="Close"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-1">
              {lang === "he" ? `שלח הודעה ל${displayName}` : `Send a message to ${card.name}`}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              {lang === "he" ? "מגיע ישירות ל-" : "Delivered directly to "}
              <span className="text-[#F47920]">{card.email}</span>
            </p>

            {formStatus === "success" ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                  ✓
                </div>
                <h4 className="font-semibold text-white mb-1">
                  {lang === "he" ? "ההודעה נשלחה בהצלחה!" : "Message Sent!"}
                </h4>
                <p className="text-xs text-slate-300 mb-6">
                  {lang === "he"
                    ? `תודה רבה. הודעתך נמסרה ישירות לאודי סטריק.`
                    : `Thank you. Your message was sent directly to ${card.name}.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEmailModalOpen(false);
                    setFormName("");
                    setFormEmail("");
                    setFormCompany("");
                    setFormMessage("");
                    setFormStatus("idle");
                  }}
                  className="bg-[#F47920] hover:bg-[#d96810] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  {lang === "he" ? "סיום" : "Done"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === "he" ? "שם מלא" : "Your Name"}
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={lang === "he" ? "שמך המלא" : "Your name"}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === "he" ? "כתובת אימייל" : "Your Email"} <span className="text-[#F47920]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === "he" ? "חברה / רשת (רשות)" : "Company (optional)"}
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder={lang === "he" ? "שם החברה שלך" : "Your company"}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F47920]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === "he" ? "תוכן ההודעה" : "Message"} <span className="text-[#F47920]">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder={lang === "he" ? "במה נוכל לסייע לך?" : "How can we help you?"}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F47920] resize-none"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg p-2.5">
                    {formError}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(false)}
                    className="w-1/3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium py-2.5 rounded-xl transition"
                  >
                    {lang === "he" ? "ביטול" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={formStatus === "sending"}
                    className="w-2/3 bg-[#F47920] hover:bg-[#d96810] text-white text-xs font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    {formStatus === "sending"
                      ? (lang === "he" ? "שולח..." : "Sending...")
                      : (lang === "he" ? "שלח הודעה" : "Send Message")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ── Priority 1: Sourcing Inquiry Drawer ── */}
      <SourcingInquiryDrawer
        isOpen={inquiryDrawerOpen}
        onClose={() => setInquiryDrawerOpen(false)}
        cardHandle={card.handle}
        lang={lang}
        suggestions={displaySourcing}
      />

      {/* ── Priority 2: 15-Min Intro Call Scheduler ── */}
      <CallSchedulerModal
        isOpen={schedulerModalOpen}
        onClose={() => setSchedulerModalOpen(false)}
        cardHandle={card.handle}
        lang={lang}
      />
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
