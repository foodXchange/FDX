"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CopyButton } from "@/components/CopyButton";
import { QrCode } from "@/components/QrCode";

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
  title: string;
  company: string;
  tagline: string;
  pitch?: string;
  email: string;
  phone: string;
  /** Raw phone digits for wa.me URL (e.g. "972525222291") */
  whatsappBuyer: string;
  whatsappManufacturer: string;
  website: string;
  linkedin?: string;
  photos: CardViewPhoto[];
  activeSourcing: string[];
}

interface CardViewProps {
  card: CardViewData;
  cardUrl: string;
  /** true = no analytics tracking, WhatsApp buttons are non-functional */
  preview?: boolean;
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

export function CardView({ card, cardUrl, preview = false }: CardViewProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

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
      if (e.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function track(event: string, extra: Record<string, string> = {}) {
    if (preview) return;
    trackEvent(event, { handle: card.handle, page_path: `/business-card/${card.handle}`, ...extra });
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setLinkCopied(true);
    track("copy_link");
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleShare() {
    const shareUrl = "https://fdx.trading/business-card/udi";
    const shareData = {
      title: "Udi Stryk — FoodXchange",
      text: "Connecting European manufacturers with the Israeli food market.",
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        track("share_card");
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track("share_card");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  const photos = card.photos;
  const hasGallery = photos.length >= 2;

  const btnBase =
    "min-h-[44px] rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 justify-center w-full active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";
  const btnSecondary = `${btnBase} bg-white/5 hover:bg-white/10 border border-white/10 text-white`;

  const buyerWaMsg = "Hi, I'm a buyer in Israel. I saw your contact card and want to discuss sourcing.";
  const mfgWaMsg = "Hi, I'm a manufacturer/exporter. I want to explore entering the Israeli market through FoodXchange.";
  const buyerNum = card.whatsappBuyer.replace(/^\+/, "");
  const mfgNum = card.whatsappManufacturer.replace(/^\+/, "");

  return (
    <div className="bg-[#1B2A4A] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl mx-auto">
      {/* ── Profile ── */}
      <div className="relative flex flex-col items-center text-center mb-8">
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

        <h1 className="text-2xl font-semibold text-white tracking-tight">{card.name}</h1>
        <p className="text-[#F47920] font-semibold text-sm tracking-wide mt-1">{card.title}</p>
        <Image
          src="/logo-dark.svg"
          alt="FoodXchange"
          width={140}
          height={32}
          className="mx-auto mt-1"
        />
        <p className="text-base font-medium text-white/90 text-center leading-snug mt-3 max-w-60">{card.tagline}</p>

        {card.pitch && (
          <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3 w-full max-w-70">
            <p className="text-xs text-slate-400 leading-relaxed text-start">{card.pitch}</p>
          </div>
        )}
      </div>

      {/* ── Save Contact (primary CTA) ── */}
      <div className="mb-6">
        <a
          href={`/api/vcard/${card.handle}`}
          download
          onClick={() => track("contact_card_vcard_download_clicked")}
          className="w-full bg-[#F47920] hover:bg-[#d96810] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <UserPlusIcon /> Save Contact
        </a>
      </div>

      {/* ── WhatsApp CTAs ── */}
      <div className="mb-6">
        <p className="text-xs text-slate-500 text-center mb-3 leading-relaxed">
          Choose a message that matches you — it helps us respond faster.
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
                className={`${btnBase} bg-[#1DA851] hover:bg-[#189a47] text-white`}
              >
                <WhatsAppIcon /> WhatsApp — I&apos;m a Buyer
              </a>
              <a
                href={`https://wa.me/${mfgNum}?text=${encodeURIComponent(mfgWaMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("contact_card_whatsapp_clicked", { audience: "supplier" })}
                className={`${btnBase} bg-[#1DA851] hover:bg-[#189a47] text-white`}
              >
                <WhatsAppIcon /> WhatsApp — I&apos;m a Manufacturer
              </a>
            </>
          )}
        </div>
      </div>

      {/* ── Active sourcing ── */}
      {card.activeSourcing.length > 0 && (
        <div
          className="mb-6 rounded-xl px-4 py-3"
          style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
        >
          <p className="text-xs font-semibold text-[#F47920] mb-2">Currently sourcing:</p>
          <ul className="space-y-1">
            {card.activeSourcing.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F47920] shrink-0" />
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
          onClick={() => track("contact_card_email_clicked")}
          className={btnSecondary}
        >
          <EmailIcon /> Email
        </a>

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
        <QrCode url="https://fdx.trading/" size={164} onRendered={() => track("contact_card_qr_rendered")} />
        <p className="text-xs text-slate-600">Scan to open this card</p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleCopyLink}
            className="text-xs text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400 rounded"
          >
            {linkCopied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={handleShare}
            className="text-xs text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400 rounded"
          >
            {copied ? "✓ Link copied!" : "Share"}
          </button>
        </div>
        <div className="flex gap-3 justify-center mt-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Udi Stryk — FoodXchange: https://fdx.trading/business-card/udi")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={`mailto:?subject=FoodXchange&body=${encodeURIComponent("https://fdx.trading/business-card/udi")}`}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Email
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://fdx.trading/business-card/udi")}`}
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
