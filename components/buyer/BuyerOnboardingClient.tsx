"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  submitBuyerFastPass,
  type BuyerOnboardingPayload,
  type BuyerOnboardingResult,
} from "@/app/buyer/onboarding/actions";

interface Props {
  initialLang?: "he" | "en";
}

const RETAIL_CHAINS = [
  { id: "שופרסל", nameHe: "שופרסל (Shufersal)", nameEn: "Shufersal Supermarkets", hqHe: "מטה שופרסל, רחוב שמוטקין 30, ראשון לציון", icon: "🛒", badge: "רשת מס' 1 בישראל" },
  { id: "רמי לוי", nameHe: "רמי לוי שיווק השקמה", nameEn: "Rami Levy Shivuk Hashikma", hqHe: "הנהלה ראשית, כנפי נשרים 24, ירושלים", icon: "🛒", badge: "דיסקאונט מוביל" },
  { id: "קרפור ישראל", nameHe: "קרפור ישראל (יינות ביתן)", nameEn: "Carrefour Israel", hqHe: "בית קרפור ישראל, רחוב עתיר ידע 1, כפר סבא", icon: "🛒", badge: "מותג בינלאומי" },
  { id: "יוחננוף", nameHe: "יוחננוף - סופרשוק לכולם", nameEn: "Yochananof Retail", hqHe: "מטה הנהלה, פארק המדע, רחובות", icon: "🛒", badge: "צמיחה מהירה" },
  { id: "ויקטורי", nameHe: "ויקטורי רשת סופרמרקטים", nameEn: "Victory Supermarket Chain", hqHe: "מטה ויקטורי, אזור תעשייה, יבנה", icon: "🛒", badge: "פריסה ארצית" },
  { id: "אושר עד", nameHe: "אושר עד (מרב מזון כל)", nameEn: "Osher Ad Wholesale", hqHe: "הנהלת אושר עד, משה שרת 1, פתח תקווה", icon: "🛒", badge: "סיטונאי / הארד דיסקאונט" },
  { id: "טיב טעם", nameHe: "טיב טעם (Tiv Taam)", nameEn: "Tiv Taam Gourmet Retail", hqHe: "מטה טיב טעם, המלאכה 14, נתניה", icon: "🛒", badge: "קולינריה וגורמה" },
  { id: "other", nameHe: "רשת עצמאית / יבואן מזון", nameEn: "Independent Retailer / Importer", hqHe: "כתובת משרד ראשי בישראל", icon: "🏪", badge: "יבוא והפצה" },
];

const CATEGORIES = [
  { id: "פסטה מחיטת דורום ודגנים", labelHe: "פסטה מחיטת דורום, פסטה מיוחדת וקמחים", labelEn: "Dry Pasta & Semolina", icon: "🍝" },
  { id: "שמן זית כתית מעולה ושמנים", labelHe: "שמן זית כתית מעולה ושמני בישול", labelEn: "Extra Virgin Olive Oil & Oils", icon: "🫒" },
  { id: "שימורי עגבניות, פסטה ורטבים", labelHe: "עגבניות מרוסקות, פאסטה ורטבי פסטה", labelEn: "Tomato Passata & Sauces", icon: "🍅" },
  { id: "שימורי טונה ודגים", labelHe: "שימורי טונה מובחרת בשמן זית/קנולה ודגים", labelEn: "Canned Tuna & Seafood", icon: "🐟" },
  { id: "שימורי קטניות וירקות", labelHe: "חומוס, שעועית, עדשים וירקות מבושלים", labelEn: "Canned Legumes & Pulses", icon: "🥫" },
  { id: "טארלי, קרקרים ומאפים איטלקיים", labelHe: "טארלי איטלקי, גריסיני, קרקרים ומאפים", labelEn: "Italian Taralli, Crackers & Bakery", icon: "🥖" },
  { id: "תחליפי חלב ומשקאות צמחיים", labelHe: "משקאות שיבולת שועל, שקדים וסויה", labelEn: "Plant-Based Milks & Beverages", icon: "🥛" },
  { id: "ירקות קפואים, פיצה וארוחות", labelHe: "ירקות קפואים מאירופה, פיצות גורמה ומוכנים", labelEn: "Frozen Foods & Pizza", icon: "❄️" },
  { id: "שוקולד, ממתקים וממרחים", labelHe: "שוקולד אירופאי, עוגיות פרימיום וממרחים", labelEn: "Confectionery & Spreads", icon: "🍫" },
];

const BENCHMARKS = [
  { id: "barilla", labelHe: "ברילה / אסם (Barilla / Osem) - פסטה", labelEn: "Barilla / Osem (Dry Pasta)" },
  { id: "yad_mordechai", labelHe: "יד מרדכי / עץ הזית - שמן זית", labelEn: "Yad Mordechai / Etz Hazayit (Olive Oil)" },
  { id: "mutti", labelHe: "מוטי / פרי גליל (Mutti) - עגבניות ורסק", labelEn: "Mutti (Tomato Passata & Pulp)" },
  { id: "rio_mare", labelHe: "ריו מרה / פילטונה (Rio Mare) - טונה", labelEn: "Rio Mare / FilTuna (Canned Tuna)" },
  { id: "loacker", labelHe: "לואקר / מנעמים (Loacker) - ופלים ומאפים", labelEn: "Loacker (Wafers & Biscuits)" },
];

export default function BuyerOnboardingClient({ initialLang = "he" }: Props) {
  const [lang, setLang] = useState<"he" | "en">(initialLang);
  const isHe = lang === "he";

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<BuyerOnboardingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State - Step 1: Retail Chain & Category
  const [selectedChain, setSelectedChain] = useState<string>("שופרסל");
  const [customChain, setCustomChain] = useState<string>("");
  const [buyerRole, setBuyerRole] = useState<string>("מנהל קטגוריה (Category Manager)");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "פסטה מחיטת דורום ודגנים",
    "שמן זית כתית מעולה ושמנים",
    "שימורי עגבניות, פסטה ורטבים",
  ]);

  // Step 2: Margins & Benchmarks
  const [targetMargin, setTargetMargin] = useState<number>(30);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([
    "barilla",
    "mutti",
  ]);
  const [kosherRequirement, setKosherRequirement] = useState<string>("רבנות ראשית לישראל ליבוא (Chief Rabbinate)");

  // Step 3: Contact & Delivery
  const [buyerName, setBuyerName] = useState("רני מור");
  const [buyerPhone, setBuyerPhone] = useState("+972-54-9988221");
  const [buyerEmail, setBuyerEmail] = useState("rani.mor@shufersal.co.il");
  const [deliveryAddress, setDeliveryAddress] = useState(
    "מטה שופרסל, רחוב שמוטקין 30, ראשון לציון"
  );
  const [deliveryFloor, setDeliveryFloor] = useState("קומה 4, חטיבת סחר ומותג פרטי");
  const [specialNotes, setSpecialNotes] = useState("נא לתאם מסירה עם קבלה בלובי מטה ההנהלה.");

  // Handle Chain Select
  const handleSelectChain = (chain: typeof RETAIL_CHAINS[0]) => {
    setSelectedChain(chain.id);
    if (chain.id !== "other") {
      setDeliveryAddress(chain.hqHe);
      if (chain.id === "שופרסל") setBuyerEmail("procurement@shufersal.co.il");
      else if (chain.id === "רמי לוי") setBuyerEmail("sourcing@rami-levy.co.il");
      else if (chain.id === "קרפור ישראל") setBuyerEmail("category@carrefour.co.il");
      else if (chain.id === "יוחננוף") setBuyerEmail("trade@yochananof.co.il");
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const toggleBenchmark = (bmId: string) => {
    setSelectedBenchmarks((prev) =>
      prev.includes(bmId) ? prev.filter((b) => b !== bmId) : [...prev, bmId]
    );
  };

  // Submit Fast Pass
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: BuyerOnboardingPayload = {
      retailChain: selectedChain,
      retailChainCustom: customChain,
      buyerRole,
      categories: selectedCategories,
      targetMarginPercent: targetMargin,
      benchmarkBrands: selectedBenchmarks,
      kosherRequirement,
      buyerName,
      buyerEmail,
      buyerPhone,
      deliveryHqAddress: deliveryAddress,
      deliveryFloorOffice: deliveryFloor,
      specialNotes,
    };

    const res = await submitBuyerFastPass(payload);
    setIsSubmitting(false);

    if (res.ok) {
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setErrorMsg(res.error || "שגיאה ברישום ה-Fast-Pass. אנא נסה שנית.");
    }
  };

  // SUCCESS SCREEN
  if (result) {
    return (
      <div dir={isHe ? "rtl" : "ltr"} className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-inner">
            ✓
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full">
              {isHe ? "ה-Fast-Pass הופעל בהצלחה" : "Retail Buyer Fast-Pass Active"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isHe
                ? `שלום ${result.buyerName}, ה-Fast-Pass של ${result.retailChain} מחובר למערכת!`
                : `Welcome ${result.buyerName}, your ${result.retailChain} Fast-Pass is live!`}
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              {isHe
                ? "הגדרות המרווח, דרישות הכשרות וערכת דוגמאות הטעימה לשולחן הטעימות סונכרנו ישירות למערכת מפעלי המזון באירופה."
                : "Your margin targets, kosher standards, and Discovery Tasting Kit courier dispatch are synchronized with verified European food manufacturers."}
            </p>
          </div>

          {/* Credentials Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-right sm:text-right max-w-lg mx-auto space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">{isHe ? "קוד מעבר מהיר (Fast-Pass ID):" : "Fast-Pass ID:"}</span>
              <span className="font-mono font-bold text-orange-400 text-sm">{result.fastPassId}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">{isHe ? "משלוח ערכת דוגמאות טעימה:" : "Discovery Tasting Kit:"}</span>
              <span className="text-emerald-400 font-semibold">{isHe ? "אושר למשלוח אקספרס למטה" : "Approved for Express Dispatch"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">{isHe ? "מספר מעקב שליח מטה:" : "Courier Tracking Code:"}</span>
              <span className="font-mono text-cyan-400 font-semibold">{result.courierTrackingCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isHe ? "חיסכון משוער במרווח גולמי:" : "Est. Landed Margin Savings:"}</span>
              <span className="text-white font-bold text-sm">{result.estimatedMarginSavings} (מול מותגי מדף קיימים)</span>
            </div>
          </div>

          {/* What's in your tasting box */}
          <div className="bg-slate-950/50 border border-slate-800/70 p-4 rounded-2xl max-w-lg mx-auto text-right text-xs space-y-2">
            <p className="font-bold text-slate-300">📦 מה כוללת ערכת הטעימות שבדרך למשרדכם:</p>
            <ul className="text-slate-400 space-y-1 list-disc list-inside text-[11px]">
              <li><strong>פסטה מחיטת דורום ברונזה 500 גרם</strong> (מפעל Pastificio Granoro, איטליה)</li>
              <li><strong>שמן זית כתית מעולה 100% איטלקי 1 ליטר</strong> (מפעל Olearia De Santis, בארי)</li>
              <li><strong>מחית עגבניות כפרית רוסטיקה 700 גרם</strong> (מפעל Mutti / Petti, איטליה)</li>
            </ul>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/he/rfq"
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
            >
              <span>🎯</span>
              <span>{isHe ? "צפייה במצגות מותג פרטי מותאמות (Smart RFQ)" : "Open Matched Private Label Decks"}</span>
            </Link>

            <Link
              href="/he/calculator/container"
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <span>🚢</span>
              <span>{isHe ? "מחשבון איחוד מכולה משולבת" : "Mixed Container Builder"}</span>
            </Link>

            <a
              href="https://wa.me/972549988221?text=שלום%20פודאקסצ'יינג',%20הפעלתי%20Fast-Pass%20לקניין%20רשת%20ואשמח%20לתיאום%20שיחה%20וסקירת%20סורסינג."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>WhatsApp ישיר</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-500">
            {isHe
              ? `אישור רשמי ופרטי חשבון סחר נשלחו לכתובת ${buyerEmail}.`
              : `A confirmation dispatch receipt has been routed to ${buyerEmail}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isHe ? "rtl" : "ltr"} className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      {/* Top Banner & Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span>⚡</span>
          <span>{isHe ? "מעבר מהיר (Fast-Pass) לקנייני רשתות מזון בישראל" : "Retail Buyer Fast-Pass Onboarding"}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {isHe ? "סורסינג ישיר ממפעלי אירופה וערכת טעימות למטה הרשת" : "Direct Sourcing from European Plants & Free HQ Tasting Kit"}
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          {isHe
            ? "רישום מהיר ב-60 שניות לקנייני ומנהלי מותג פרטי ברשתות השיווק בישראל. הגדרת התראות מרווח מדף גולמי, סינון כשרות וקבלת ערכת דוגמאות אישית לשולחן הטעימות."
            : "60-second onboarding for Israeli retail category managers. Configure landed shelf margins, kosher audits, and receive a free 3-product tasting box at your HQ."}
        </p>
      </div>

      {/* Step Indicators */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            { step: 1, labelHe: "1. רשת וקטגוריות", labelEn: "1. Retail Chain & Categories", icon: "🛒" },
            { step: 2, labelHe: "2. יעדי מרווח וכשרות", labelEn: "2. Margin Targets & Kosher", icon: "📊" },
            { step: 3, labelHe: "3. משלוח ערכת טעימה", labelEn: "3. Tasting Kit HQ Delivery", icon: "📦" },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition ${
                  isActive
                    ? "bg-orange-500/15 border-orange-500 text-white shadow-xs font-bold"
                    : isCompleted
                    ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-400 font-semibold"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-orange-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : item.step}
                </div>
                <span className="text-xs font-medium">{isHe ? item.labelHe : item.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
        {/* ================= STEP 1: RETAIL CHAIN & CATEGORIES ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🛒</span>
                <span>{isHe ? "שלב 1: בחירת רשת קמעונאית ותחומי אחריות" : "Step 1: Retail Chain & Category Ownership"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isHe
                  ? "בחר את רשת השיווק בה אתה פועל ואת הקטגוריות המסחריות שתחת ניהולך."
                  : "Select your supermarket network and category ownership."}
              </p>
            </div>

            {/* Supermarket Chain Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isHe ? "רשת שיווק / ארגון קמעונאי" : "Select Supermarket Chain"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                {RETAIL_CHAINS.map((chain) => {
                  const isSelected = selectedChain === chain.id;
                  return (
                    <button
                      key={chain.id}
                      type="button"
                      onClick={() => handleSelectChain(chain)}
                      className={`p-3.5 rounded-xl border text-right transition space-y-1 ${
                        isSelected
                          ? "bg-orange-500/15 border-orange-500 text-white shadow-xs font-bold"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{chain.icon}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {chain.badge}
                        </span>
                      </div>
                      <p className="font-semibold text-white truncate text-xs">{chain.nameHe}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom chain name input if 'other' selected */}
            {selectedChain === "other" && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">שם הרשת או חברת היבוא *</label>
                <input
                  type="text"
                  required
                  value={customChain}
                  onChange={(e) => setCustomChain(e.target.value)}
                  placeholder="למשל: סופר ברקת / נטו מלינדה / רשת עצמאית"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-orange-500"
                />
              </div>
            )}

            {/* Buyer Role Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">תפקיד בארגון *</label>
                <select
                  value={buyerRole}
                  onChange={(e) => setBuyerRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 text-xs"
                >
                  <option value="מנהל קטגוריה (Category Manager)">מנהל/ת קטגוריה (Category Manager)</option>
                  <option value="סמנכ״ל סחר / קניינות (VP Commercial)">סמנכ״ל/ית סחר וקניינות (VP Commercial)</option>
                  <option value="מנהל מותג פרטי (Private Label Lead)">מנהל/ת מותג פרטי (Private Label Lead)</option>
                  <option value="קניין יבוא ישיר (Direct Import Buyer)">קניין/ית יבוא ישיר (Direct Import Buyer)</option>
                  <option value="מנהל רכש וסורסינג">מנהל/ת רכש וסורסינג בינלאומי</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">היקף יבוא משוער לקטגוריה</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500 text-xs"
                >
                  <option value="1_to_5">1 – 5 מכולות בשנה (הרצה ומבחן מדף)</option>
                  <option value="6_to_20">6 – 20 מכולות בשנה (החלפת מותג מוביל)</option>
                  <option value="20_plus">מעל 20 מכולות בשנה (היקף רשת ארצית)</option>
                </select>
              </div>
            </div>

            {/* Category Ownership Multi-Select */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                בחר את הקטגוריות שתחת ניהולך (נבחר: {selectedCategories.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between text-right transition ${
                        isChecked
                          ? "bg-orange-500/20 border-orange-500 text-white font-medium shadow-xs"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-lg shrink-0">{cat.icon}</span>
                        <span className="truncate">{cat.labelHe}</span>
                      </div>
                      <span className={`text-xs shrink-0 ${isChecked ? "text-orange-400 font-bold" : "text-slate-600"}`}>
                        {isChecked ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>המשך ליעדי מרווח וכשרות</span>
                <span>&larr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: MARGIN TARGETS & KOSHER ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📊</span>
                <span>{isHe ? "שלב 2: הגדרת יעדי מרווח גולמי וכשרות" : "Step 2: Margin Targets & Kosher Standards"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isHe
                  ? "הגדר את סף המרווח הגולמי שחייב להתקבל במרלו״ג ואת מותגי המדף הקיימים שתרצה להחליף."
                  : "Set your gross margin hurdles and benchmark brands to substitute."}
              </p>
            </div>

            {/* Target Landed Margin Slider / Cards */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  יעד מרווח גולמי רצוי במרלו״ג (Landed Gross Margin)
                </label>
                <span className="text-base font-extrabold text-orange-400 font-mono">
                  {targetMargin}% מרווח מדף
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                {[25, 30, 35, 40].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTargetMargin(pct)}
                    className={`py-3 rounded-xl border text-center transition font-semibold ${
                      targetMargin === pct
                        ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {pct}% מרווח
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                מערכת FoodXchange תסנן יצרנים אירופאיים שעלות הנחיתה (CIF אשדוד + מכס + הובלה למרלו״ג) מאפשרת מרווח זה.
              </p>
            </div>

            {/* Benchmark Substitutions */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                מותגי מדף יקרים שתרצה להחליף במותג פרטי אירופאי רווחי (Benchmark Targets)
              </label>
              <div className="space-y-2 text-xs">
                {BENCHMARKS.map((bm) => {
                  const isChecked = selectedBenchmarks.includes(bm.id);
                  return (
                    <div
                      key={bm.id}
                      onClick={() => toggleBenchmark(bm.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isChecked ? "bg-amber-500/15 border-amber-500/80 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isChecked} onChange={() => {}} className="accent-amber-500 w-4 h-4 rounded" />
                        <span className="font-semibold text-white">{bm.labelHe}</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        חיסכון צפוי לרשת: 28% – 35%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kosher Requirement */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                דרישת כשרות סף לקליטה ברשת
              </label>
              <select
                value={kosherRequirement}
                onChange={(e) => setKosherRequirement(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-orange-500"
              >
                <option value="רבנות ראשית לישראל ליבוא (Chief Rabbinate)">רבנות ראשית לישראל ליבוא (אישור רשמי של שירות המזון והרבנות)</option>
                <option value="בד״צ מהדרין / בית יוסף / העדה החרדית">בד״צ מהדרין (בד״צ בית יוסף / העדה החרדית / מחזיקי הדת)</option>
                <option value="OU / OK / Star-K בינלאומי">גוף כשרות בינלאומי מוכר (OU / OK / Star-K / בד״צ לונדון)</option>
                <option value="כשרות קהילתית אירופאית">כשרות קהילה מקומית באירופה (אישור הרב המקומי)</option>
              </select>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
              >
                &rarr; חזור
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <span>המשך לפרטי משלוח ערכת הטעימות</span>
                <span>&larr;</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: DISCOVERY TASTING KIT DISPATCH ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📦</span>
                <span>{isHe ? "שלב 3: פרטי קשר ומשלוח ערכת דוגמאות למטה הרשת" : "Step 3: Contact & Tasting Kit HQ Delivery"}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isHe
                  ? "כל קניין ברשת זכאי לערכת היכרות אישית של 3 מוצרים מובחרים מאירופה, הנשלחת בשילוח אקספרס ישירות לשולחן הטעימות במטה."
                  : "Verified retail category leads receive a curated 3-product evaluation tasting kit dispatched directly to retail HQ."}
              </p>
            </div>

            {/* Delivery Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">שם מלא של הקניין / מנהל הקטגוריה *</label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="למשל: רני מור"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">טלפון ישיר / WhatsApp לקבלת עדכוני שליח *</label>
                <input
                  type="text"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="054-9988221"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-orange-500 text-left"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">כתובת אימייל ארגונית ברשת השיווק *</label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="procurement@shufersal.co.il"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-orange-500 text-left"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">כתובת מטה ההנהלה למשלוח הערכה *</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="למשל: מטה שופרסל, שמוטקין 30, ראשון לציון"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">קומה / אגף / חדר קניינות</label>
                <input
                  type="text"
                  value={deliveryFloor}
                  onChange={(e) => setDeliveryFloor(e.target.value)}
                  placeholder="למשל: קומה 4, חטיבת סחר"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">הנחיות מסירה מיוחדות לשליח</label>
                <input
                  type="text"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="למשל: לתאם מראש עם קבלת הלובי"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-950/60 border border-rose-500/50 p-3.5 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
              >
                &rarr; חזור
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-orange-500/25 transition disabled:opacity-50 flex items-center gap-2"
              >
                <span>{isSubmitting ? "מפעיל Fast-Pass ומאשר משלוח..." : "הפעלת Fast-Pass ואישור משלוח ערכה 🚀"}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
