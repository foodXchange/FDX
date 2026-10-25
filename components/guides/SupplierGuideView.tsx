"use client";

import { useState } from "react";
import Link from "next/link";

function BuildingIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ShipIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5M4 19a2 2 0 002 2h12a2 2 0 002-2l-1-7H5l-1 7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12V5a2 2 0 012-2h6a2 2 0 012 2v7" />
    </svg>
  );
}

function PackageCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ScaleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function GlobeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function PrinterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function FileCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function SupplierGuideView() {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const invoiceSampleText = `COMMERCIAL INVOICE - SAMPLES FOR SENSORY EVALUATION ONLY
DATE: [CURRENT_DATE]
INVOICE NO: FDX-SAMPLE-[YYYYMMDD]

SHIPPER / EXPORTER:
[Your Factory Company Name]
[Factory Street Address, City, Postal Code, Country]
VAT / Tax ID: [Your VAT Number]
Contact: [Export Manager Name & Phone]

CONSIGNEE:
FoodXchange Ltd. — Sourcing & Tasting Hub
Address: Derech Menachem Begin 144, Midtown Tower, Tel Aviv, Israel
Postal Code: 6492102
Tel: +972-3-720-8400
Email: desk@fdx.trading
Attention: Deals Desk / Tasting Samples Division

DESCRIPTION OF GOODS:
- Item: Food samples for organoleptic / sensory testing only
- Contents: [e.g. 4 x 500g Pasta Retail Samples / 2 x 750ml Olive Oil Samples]
- HS Tariff Code: [e.g. 1902.19 / 1509.20]
- Country of Origin: [e.g. Italy / Spain / France]

CUSTOMS DECLARATION CLAUSE:
"Food samples of no commercial value. Shipped strictly for organoleptic evaluation and laboratory testing. Not for commercial distribution, resale, or retail consumption. Value stated for customs purposes only."

NOMINAL CUSTOMS VALUE: € 10.00 EUR
FREIGHT CHARGES: Prepaid by Shipper
TERMS OF DELIVERY: DDP / CIP Tel Aviv Airport`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invoiceSampleText);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2500);
  };

  const tabs = [
    {
      id: 1,
      badge: "Chapter 1",
      title: "Why FoodXchange?",
      subtitle: "Direct access to Israeli retail chains",
      icon: BuildingIcon,
    },
    {
      id: 2,
      badge: "Chapter 2",
      title: "Quoting & Containers",
      subtitle: "CIF Haifa, MOQ & pricing logic",
      icon: ShipIcon,
    },
    {
      id: 3,
      badge: "Chapter 3",
      title: "Sample Dispatch Protocol",
      subtitle: "Fast courier clearance & customs docs",
      icon: PackageCheckIcon,
    },
    {
      id: 4,
      badge: "Chapter 4",
      title: "Kosher & SI 1145 Labels",
      subtitle: "Rabbinical audits & Hebrew dielines",
      icon: ScaleIcon,
    },
    {
      id: 5,
      badge: "Chapter 5",
      title: "Payment & Commercial Terms",
      subtitle: "30/70 secure B2B transaction structure",
      icon: ShieldCheckIcon,
    },
  ];

  const faqs = [
    {
      q: "Does FoodXchange charge European suppliers listing or subscription fees?",
      a: "No. Registering your manufacturing facility, listing your product catalog, and receiving active RFQ opportunities is 100% free. We never charge monthly subscriptions or upfront listing fees. We work transparently on successful commercial executions.",
    },
    {
      q: "We don't currently have Kosher certification. Can we still sell to Israel?",
      a: "Yes. Many successful European exporters started with non-kosher facilities. If an Israeli retail chain expresses interest in your product, FoodXchange guides you through a turnkey Kosher production run. A rabbinical delegation supervises a dedicated 2-to-3 day production batch, avoiding any permanent alteration to your everyday factory setup.",
    },
    {
      q: "Who handles the Hebrew translation and graphic design for the retail packaging?",
      a: "FoodXchange performs an automated regulatory audit against Israeli Standard SI 1145. We calculate nutritional thresholds (Red Warning Badges for sodium, sugar, and saturated fat), draft the exact Hebrew ingredient declaration, and supply your graphic agency with ready-to-use vector overlays for your printing plates.",
    },
    {
      q: "How large are typical orders from Israeli supermarket chains?",
      a: "Orders typically start with a trial container (1 x 20ft FCL or 1 x 40ft High Cube FCL containing 20 to 24 metric tons). For high-velocity categories such as pasta, olive oil, tomato passata, cookies, canned legumes, and tuna, established programs scale to multiple containers per month.",
    },
    {
      q: "What are the standard payment terms for European factories?",
      a: "Standard terms for verified Israeli supermarket buyers are: 30% advance deposit upon Purchase Order countersignature and packaging approval, with the remaining 70% paid against copy of the Ocean Bill of Lading (B/L) and pre-shipment Certificate of Analysis (COA).",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 ltr" dir="ltr">
      {/* ── STYLES FOR PRINT ── */}
      <style jsx global>{`
        @media print {
          nav, footer, .no-print, button {
            display: none !important;
          }
          body, main, div {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-block {
            page-break-inside: avoid;
            border: 1px solid #cccccc !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-title {
            color: #0f172a !important;
          }
          .print-subtitle {
            color: #475569 !important;
          }
          .print-badge {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            background: transparent !important;
          }
        }
      `}</style>

      {/* ── TOP HERO SECTION ── */}
      <header className="relative border-b border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb & Top Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Link href="/" className="hover:text-amber-400 transition-colors">
                FoodXchange
              </Link>
              <span>/</span>
              <span className="text-amber-400 font-medium">European Supplier Export Guide</span>
            </div>

            <div className="flex items-center gap-3 no-print">
              <Link
                href="/he/guide"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                <GlobeIcon className="w-3.5 h-3.5" />
                <span>מדריך קניינים (עברית)</span>
              </Link>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm cursor-pointer"
                title="Print or Save as PDF"
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>European Food Factory Export Playbook</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight print-title">
              The Supplier Guide to Exporting Food & Beverage to Israel
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 print-subtitle">
              How European food producers connect directly with leading Israeli supermarket chains and national food
              distributors. Master RFQ quoting, seamless tasting sample clearance, Israeli SI 1145 label compliance, and
              secure container shipments.
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
              <div>
                <div className="text-2xl font-bold text-amber-400">€3.8B+</div>
                <div className="text-xs text-slate-400">Israeli Food Import Market</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">0%</div>
                <div className="text-xs text-slate-400">Supplier Listing Commission</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sky-400">FCL 20/40&apos;</div>
                <div className="text-xs text-slate-400">Standard Container Volumes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-400">30 / 70%</div>
                <div className="text-xs text-slate-400">Standard Payment Terms</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 5-CHAPTER INTERACTIVE WORKFLOW ── */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10 no-print">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-start transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 text-white shadow-lg"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    isActive ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1 ${
                      isActive ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {tab.badge}
                  </span>
                  <div className={`text-sm font-semibold leading-tight ${isActive ? "text-white" : "text-slate-300"}`}>
                    {tab.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-1">{tab.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── CHAPTER CONTENT ── */}
        <div className="space-y-12">
          {/* CHAPTER 1: WHY FOODXCHANGE */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeTab === 1 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                Chapter 1
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                Direct Retail Access with Zero Middleman Friction
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              Historically, European factories could only sell into Israel through exclusive third-party import agents who
              took 30% to 50% distributor margins, hiding real retail shelf performance and limiting container scale.
              FoodXchange connects you directly with category buyers at major retail supermarket chains (Shufersal, Victory,
              Rami Levy, Yochananof, Tiv Taam) and licensed food importers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-emerald-400 font-semibold text-sm mb-1">Direct Purchase Orders</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You contract and invoice the Israeli supermarket chain or verified import house directly on agreed CIF
                  Haifa or FOB European port terms.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-amber-400 font-semibold text-sm mb-1">Zero Hidden Commissions</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No factory fee deductions, no monthly portal fees, and no shelf-space listing taxes. What you quote is what
                  you get paid.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-sky-400 font-semibold text-sm mb-1">Turnkey Local Localization</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  FoodXchange handles Hebrew nutrition formatting, allergen declarations, and Kosher regulatory paperwork on
                  the buyer side so you don&apos;t need an internal Hebrew team.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 no-print pt-2">
              <Link
                href="/en/suppliers/register"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
              >
                <span>Register Your Factory</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/en/contact"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-medium text-xs hover:border-slate-500 hover:text-white transition-colors"
              >
                <span>Speak with an Export Specialist</span>
              </Link>
            </div>
          </div>

          {/* CHAPTER 2: QUOTING & CONTAINERS */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeTab === 2 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                Chapter 2
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                Quoting RFQs, Container Palletization & Incoterms
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              Israeli buyers evaluate suppliers based on landed feasibility. The fastest way to win an RFQ is providing a
              clear container loading specification and quoting either CIF Port of Haifa / Ashdod or FOB at your local
              European ocean terminal.
            </p>

            <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 mb-6">
              <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <ShipIcon className="w-4 h-4 text-sky-400" />
                <span>Recommended Container Configuration Guidelines:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">20ft Dry Box FCL</span>
                  <span className="text-slate-400">
                    Typically 11 Euro pallets (800x1200mm) or 9-10 Standard Industrial pallets (1000x1200mm). Max payload: ~21
                    metric tons.
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">40ft High Cube (HC) FCL</span>
                  <span className="text-slate-400">
                    Typically 24-25 Euro pallets or 20-21 Standard Industrial pallets. Ideal for high-volume, low-density retail
                    goods (chips, biscuits, pasta).
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">Temperature-Controlled (Reefer)</span>
                  <span className="text-slate-400">
                    For chilled cheeses (+4°C) or frozen vegetables/pastries (-18°C). Specify pre-cooling requirements and
                    temperature data logger inclusion.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
              💡 <strong>Pro Tip:</strong> Israeli buyers prefer quoting in <strong>EUR (€)</strong> or{" "}
              <strong>USD ($)</strong> per consumer unit (e.g. €0.65 / 500g package) alongside the master carton quantity
              (e.g. 12 units/box, 72 boxes/pallet).
            </div>
          </div>

          {/* CHAPTER 3: SAMPLE DISPATCH PROTOCOL */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeTab === 3 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                Chapter 3
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                Courier Tasting Sample Protocol & Airfreight Customs Waiver
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              Every major private-label contract in Israel begins with an executive tasting session. However, food samples
              sent via DHL, FedEx, or UPS can easily be delayed at Ben Gurion Airport (TLV) if declared as commercial cargo.
              Follow this exact protocol to guarantee 48-hour door-to-door delivery.
            </p>

            {/* Interactive Invoice Template Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheckIcon className="w-4 h-4" />
                  <span>Approved Pro-Forma Sample Invoice Template</span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
                >
                  {copiedInvoice ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  <span>{copiedInvoice ? "Copied to Clipboard!" : "Copy Template"}</span>
                </button>
              </div>

              <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-72">
                {invoiceSampleText}
              </pre>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-200 block mb-1">1. Keep Value Nominal</strong>
                Always state a nominal customs value under €20 (e.g., €10 total). High declared values trigger automatic VAT
                and physical food inspection fees.
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-200 block mb-1">2. Print 3 Copies</strong>
                Place 3 signed copies of the pro-forma invoice in the clear adhesive pouch outside the courier parcel.
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-200 block mb-1">3. Share AWB Number</strong>
                Immediately email the courier tracking number (AWB) to desk@fdx.trading so our desk can monitor transit.
              </div>
            </div>
          </div>

          {/* CHAPTER 4: KOSHER & LABELS */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeTab === 4 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                Chapter 4
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                Israeli SI 1145 Standards & Kosher Certification Protocols
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              Israel has adopted European Food Safety Authority (EFSA) norms under the &quot;What is Good for Europe is Good for
              Israel&quot; mutual recognition reform. However, two specific requirements remain: packaging compliance with
              Standard SI 1145, and Kosher authorization by the Chief Rabbinate of Israel.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Mandatory Red Warning Badges (SI 1145)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Under the Israeli Protection of Public Health (Food) Regulations, foods exceeding the following thresholds
                  per 100g must bear clear red circular warning symbols on the front of the consumer package:
                </p>
                <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div>• Sodium (Salt): ≥ 400 mg per 100g</div>
                  <div>• Total Sugars: ≥ 10.0 g per 100g</div>
                  <div>• Saturated Fats: ≥ 4.0 g per 100g</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  FoodXchange automatically calculates whether your product triggers red badges and generates the exact
                  graphic overlay.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Chief Rabbinate Kosher Authorization</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  To be sold in mainstream retail chains in Israel, products must receive an official import clearance
                  certificate from the Chief Rabbinate of Israel.
                </p>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Recognized certifications: OU, OK, Star-K, Badatz, Kof-K.</li>
                  <li>Non-certified factories: We organize dedicated 2-day supervised batch campaigns.</li>
                  <li>Rabbinical delegation travel and supervision costs are coordinated through the buyer program.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CHAPTER 5: PAYMENT & COMMERCIAL TERMS */}
          <div
            className={`print-block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm transition-all ${
              activeTab === 5 ? "ring-1 ring-amber-500/20" : "hidden sm:block opacity-90"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold print-badge">
                Chapter 5
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white print-title">
                Commercial Security & 30/70 Payment Milestones
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 print-subtitle">
              We understand that manufacturing custom-packaged food products for an export market requires ironclad financial
              protection. All purchase orders executed through FoodXchange adhere to standardized international B2B banking
              milestones.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-amber-400 font-bold text-sm mb-1">Milestone 1: 30% Advance Deposit</div>
                <div className="text-xs text-slate-300 font-semibold mb-2">Upon PO Signing & Artwork Proof Approval</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The buyer remits a 30% wire transfer deposit to secure factory scheduling, raw material allocation, and
                  custom packaging plate engraving.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-emerald-400 font-bold text-sm mb-1">Milestone 2: 70% Final Balance</div>
                <div className="text-xs text-slate-300 font-semibold mb-2">Against Bill of Lading (B/L) & Lab COA Copy</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upon container loading and departure from your European port, you transmit the Bill of Lading copy, packing
                  list, and Certificate of Analysis. The buyer releases the remaining 70% wire transfer before original
                  surrender.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              🔒 <strong>Dispute Resolution:</strong> Contracts are executed under standard Incoterms 2020 rules with
              dispute resolution governed under Swiss or English commercial arbitration, protecting both parties.
            </div>
          </div>
        </div>
      </section>

      {/* ── SUPPLIER FAQ ACCORDION ── */}
      <section className="py-16 px-6 border-t border-slate-800 bg-slate-900/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 print-title">
              Frequently Asked Questions by European Food Manufacturers
            </h2>
            <p className="text-sm text-slate-400 print-subtitle">
              Everything you need to know about partnering with Israeli retailers through FoodXchange
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden print-block">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-start hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-200">{faq.q}</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? "rotate-180" : ""}`}
                  />
                </button>
                {(openFaq === idx || typeof window === "undefined") && (
                  <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA SECTION ── */}
      <section className="py-16 px-6 border-t border-white/10 bg-gradient-to-t from-slate-950 to-slate-900 text-center no-print">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
            Expand Your European Factory into Israel
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mb-8">
            Register your manufacturing capabilities today. Get introduced directly to active retail buyer requests and
            scale your container exports.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/en/suppliers/register"
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition-all shadow-lg hover:shadow-amber-500/20"
            >
              Register Your Factory Free
            </Link>
            <Link
              href="/en/contact"
              className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium text-sm hover:border-slate-500 transition-colors"
            >
              Contact Our Deal Desk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
