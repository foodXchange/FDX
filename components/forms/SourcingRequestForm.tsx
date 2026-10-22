"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import MultiImageUpload, { type UploadedImage } from "@/components/ui/MultiImageUpload";
import ContactFields from "@/components/forms/ContactFields";
import { isValidName } from "@/lib/validation/isValidName";
import { isValidCompanyName } from "@/lib/validation/isValidCompanyName";
import { CATEGORY_COLORS } from "@/lib/products/cleanProductName";
import type { ConciergeQuestion, ConciergeResponse } from "@/app/api/sourcing/concierge/route";

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS);

const VOLUME_UNIT_OPTIONS = [
  { value: "tons", label: "tons / year" },
  { value: "kg", label: "kg / year" },
  { value: "units", label: "units / year" },
  { value: "pallets", label: "pallets / year" },
  { value: "containers", label: "containers / year" },
] as const;

interface SourcingRequestFormProps {
  source?: string;
  heading?: string;
  subheading?: string;
  showExamples?: boolean;
  compact?: boolean;
  initialDescription?: string;
  onSuccess?: () => void;
  lang?: "en" | "he";
}

type KosherOption = "chief-rabbinate" | "badatz" | "mehadrin" | "any" | "none";
type BrandingMode = "private_label" | "supplier_brand" | "both";

interface ExampleRequest {
  title: string;
  details: string;
  description: string;
  kosher: KosherOption;
  benchmarkBrand?: string;
  packaging?: string;
  unitWeight?: string;
  brandingMode?: BrandingMode;
  dietaryClaims?: string[];
}

interface StoredFormData {
  description?: string;
  category?: string;
  kosher?: KosherOption;
  volume?: string;
  volumeUnit?: string;
  packaging?: string;
  privateLabel?: boolean;
  brandingMode?: BrandingMode;
  benchmarkBrand?: string;
  unitWeight?: string;
  productCount?: string;
  dietaryClaims?: string[];
  sellerBriefText?: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  company?: string;
}

interface ContactCache {
  name?: string;
  email?: string;
  whatsapp?: string;
  company?: string;
}

interface SubmitResponse {
  ok?: boolean;
  error?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const KOSHER_CERTS: Record<KosherOption, string[]> = {
  "chief-rabbinate": ["Chief Rabbinate Kosher"],
  badatz: ["Badatz Beit Yosef Kosher"],
  mehadrin: ["Mehadrin Kosher"],
  any: ["Kosher"],
  none: [],
};

const KOSHER_OPTIONS: { value: KosherOption; label: string }[] = [
  { value: "chief-rabbinate", label: "Yes — Chief Rabbinate" },
  { value: "badatz", label: "Yes — Badatz Beit Yosef" },
  { value: "mehadrin", label: "Yes — Mehadrin" },
  { value: "any", label: "Yes — Any kosher" },
  { value: "none", label: "No kosher required" },
];

const KOSHER_OPTIONS_HE: { value: KosherOption; label: string }[] = [
  { value: "chief-rabbinate", label: "רבנות ראשית לישראל (יבוא)" },
  { value: "badatz", label: "בד״ץ מוכר (מהדרין / גלאט)" },
  { value: "mehadrin", label: "מהדרין אחר (מוכר ביבוא)" },
  { value: "any", label: "כל תעודת כשרות קיימת" },
  { value: "none", label: "ללא דרישת כשרות" },
];

const PACKAGING_PRESETS = [
  "Plastic Squeeze Bottle",
  "Glass Bottle / Jar",
  "5kg Catering Plastic Box",
  "5kg Catering Box + Dispenser Pump (Burger King / QSR style)",
  "Small Portion Sachets (10g–15g)",
  "Retail Cans / Tins",
  "Resealable Stand-Up Pouch",
  "Industrial Bulk / IBC",
];

const PACKAGING_PRESETS_HE = [
  "בקבוק לחיץ (Squeeze)",
  "בקבוק / צנצנת זכוכית",
  "דלי מוסדי 5 ק״ג",
  "מכל 5 ק״ג + משאבת מזיגה",
  "שקיקים אישיים (10–15 גרם)",
  "שימורים / קופסאות פח",
  "שקית עומדת (Doypack / Pouch)",
  "צובר תעשייתי / IBC",
];

const DIETARY_PRESETS = [
  "Gluten-Free",
  "Organic",
  "Sugar-Free",
  "Good for Diabetics",
  "Protein-Enriched",
  "Vegan / Plant-Based",
  "No Preservatives",
  "Non-GMO",
];

const DIETARY_PRESETS_HE = [
  "ללא גלוטן",
  "אורגני",
  "ללא סוכר",
  "מתאים לסוכרתיים",
  "עשיר בחלבון",
  "טבעוני / מן הצומח",
  "ללא חומרים משמרים",
  "Non-GMO",
];

const BENCHMARK_BRAND_SUGGESTIONS = [
  "Hellmann's",
  "Heinz",
  "Mutti",
  "Barilla",
  "Balconi",
  "Osem",
  "Rio Mare",
];

const BENCHMARK_BRAND_SUGGESTIONS_HE = [
  "הלמנס",
  "היינץ",
  "מוטי (Mutti)",
  "ברילה",
  "בלקוני",
  "אסם",
  "ריו מרה",
];

const EXAMPLES: ExampleRequest[] = [
  {
    title: "🥫 Mayo 5kg + Pump",
    details: "5kg plastic box + catering pump · Kosher · Private Label",
    description:
      "Looking for a rich, creamy mayonnaise similar to Hellmann's or Heinz. Packed in a 5-kilo plastic catering box with a special dispenser pump suitable for QSR / Burger King style stations. Gluten-free, Chief Rabbinate kosher, private label.",
    kosher: "chief-rabbinate",
    benchmarkBrand: "Hellmann's / Heinz",
    packaging: "5kg Catering Box + Dispenser Pump (Burger King / QSR style)",
    unitWeight: "5kg",
    brandingMode: "private_label",
    dietaryClaims: ["Gluten-Free"],
  },
  {
    title: "🫒 Extra Virgin Olive Oil",
    details: "750ml glass · Chief Rabbinate · 20 tons/yr",
    description:
      "Extra virgin olive oil, 750ml dark glass bottle, Chief Rabbinate kosher certification, private label packaging, approximately 20 tons per year",
    kosher: "chief-rabbinate",
    packaging: "Glass Bottle / Jar",
    unitWeight: "750ml",
    brandingMode: "private_label",
  },
  {
    title: "🍅 Mutti Tomato Paste",
    details: "115g & 200g · Chief Rabbinate · Private Label",
    description:
      "Double-concentrated tomato paste similar to Mutti quality in retail portion cups, 115g and 200g sizes, Chief Rabbinate kosher certification, private label production",
    kosher: "chief-rabbinate",
    benchmarkBrand: "Mutti",
    packaging: "Retail Cans / Tins",
    unitWeight: "115g & 200g",
    brandingMode: "private_label",
  },
  {
    title: "🍫 Balconi Sugar-Free Wafers",
    details: "250g bag · Diabetic-friendly · Badatz",
    description:
      "Crispy hazelnut & cocoa wafer cubes similar to Balconi, sugar-free and suitable for diabetics, 250g pillow bag, Badatz kosher certification",
    kosher: "badatz",
    benchmarkBrand: "Balconi",
    packaging: "Resealable Stand-Up Pouch",
    unitWeight: "250g",
    brandingMode: "private_label",
    dietaryClaims: ["Sugar-Free", "Good for Diabetics"],
  },
  {
    title: "🥣 Protein Organic Granola",
    details: "400g pouch · Gluten-Free & Organic · Badatz",
    description:
      "Organic protein-enriched granola with dried fruit mix, gluten-free oats, 400g resealable bag, Badatz Beit Yosef kosher certification, 10 tons per year",
    kosher: "badatz",
    packaging: "Resealable Stand-Up Pouch",
    unitWeight: "400g",
    brandingMode: "private_label",
    dietaryClaims: ["Organic", "Gluten-Free", "Protein-Enriched"],
  },
  {
    title: "🐟 Catering Tuna 1kg",
    details: "1kg catering format · Chief Rabbinate · Supplier or PL",
    description:
      "Skipjack tuna chunks in sunflower oil, 1kg catering cans or pouches for foodservice kitchens, Chief Rabbinate kosher certification",
    kosher: "chief-rabbinate",
    benchmarkBrand: "Rio Mare",
    packaging: "Retail Cans / Tins",
    unitWeight: "1kg",
    brandingMode: "both",
  },
];

const EXAMPLES_HE: ExampleRequest[] = [
  {
    title: "🥫 מיונז מוסדי 5 ק״ג + משאבה",
    details: "מכל 5 ק״ג + משאבה מוסדית · כשרות רבנות · מותג פרטי",
    description:
      "דרוש מיונז עשיר וקרמי בטעם דומה להלמנס או היינץ. ארוז במכל פלסטיק 5 ק״ג עם משאבת מזיגה מתאימה לרשתות מזון מהיר (QSR). ללא גלוטן, כשרות רבנות ראשית, מותג פרטי.",
    kosher: "chief-rabbinate",
    benchmarkBrand: "הלמנס / היינץ",
    packaging: "מכל 5 ק״ג + משאבת מזיגה",
    unitWeight: "5 ק״ג",
    brandingMode: "private_label",
    dietaryClaims: ["ללא גלוטן"],
  },
  {
    title: "🫒 שמן זית כתית מעולה",
    details: "בקבוק זכוכית כהה 750 מ״ל · רבנות ראשית · 20 טון בשנה",
    description:
      "שמן זית כתית מעולה (EVOO) בחמיצות מירבית 0.5%, בקבוק זכוכית כהה 750 מ״ל, כשרות רבנות ראשית יבוא, מותג פרטי של הרשת, כ-20 טון בשנה (מכולה חודשית).",
    kosher: "chief-rabbinate",
    packaging: "בקבוק / צנצנת זכוכית",
    unitWeight: "750 מ״ל",
    brandingMode: "private_label",
  },
  {
    title: "🍟 צ׳יפס בלגי קפוא",
    details: "שקית 1 ק״ג / 2.5 ק״ג · רבנות · 3–4 מכולות בחודש",
    description:
      "פלחי תפו״א קפואים (צ׳יפס בלגי חתוך 9x9 ו-10x10), שקיות 1 ק״ג למדף קמעונאי או 2.5 ק״ג לפודסרוויס, כשרות רבנות ראשית, מותג פרטי, כ-3 מכולות בחודש.",
    kosher: "chief-rabbinate",
    packaging: "שקית עומדת (Doypack / Pouch)",
    unitWeight: "1 ק״ג",
    brandingMode: "private_label",
  },
  {
    title: "🍅 רסק עגבניות איטלקי מרוכז כפול",
    details: "גביעי מנות 115 גרם ו-200 גרם · רבנות ראשית · מותג פרטי",
    description:
      "רסק עגבניות מרוכז כפול בריכוז 28-30% Brix, איכות פרימיום דומה למוטי, גביעים קמעונאיים 115 גרם ו-200 גרם, כשרות רבנות ראשית, מותג פרטי.",
    kosher: "chief-rabbinate",
    benchmarkBrand: "מוטי (Mutti)",
    packaging: "שימורים / קופסאות פח",
    unitWeight: "115 גרם",
    brandingMode: "private_label",
  },
  {
    title: "🥣 גרנולה אורגנית עשירה בחלבון",
    details: "אריזת 400 גרם · ללא גלוטן · בד״ץ",
    description:
      "גרנולה אורגנית מועשרת בחלבון עם תערובת פירות יער מיובשים, שיבולת שועל ללא גלוטן, שקית עומדת 400 גרם עם פס סגירה חוזרת, כשרות בד״ץ, 10 טון בשנה.",
    kosher: "badatz",
    packaging: "שקית עומדת (Doypack / Pouch)",
    unitWeight: "400 גרם",
    brandingMode: "private_label",
    dietaryClaims: ["אורגני", "ללא גלוטן", "עשיר בחלבון"],
  },
];

function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-200">
      {children}
    </label>
  );
}

function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function inputClass(extra = "") {
  return `w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${extra}`;
}

function SectionHeader({
  n,
  title,
  badge,
  first,
}: {
  n: number;
  title: string;
  badge?: string;
  first?: boolean;
}) {
  return (
    <div className={`${first ? "" : "border-t border-white/10 pt-5"} mb-2 flex items-center justify-between`}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
        {n}. {title}
      </h3>
      {badge && (
        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-300">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function SourcingRequestForm({
  source = "buyers-page",
  heading,
  subheading,
  showExamples = false,
  compact = false,
  initialDescription,
  onSuccess,
  lang = "en",
}: SourcingRequestFormProps) {
  const isHe = lang === "he";

  const resolvedHeading =
    heading ?? (isHe ? "הגשת בקשת רכש ממוקדת (RFQ)" : "Start Your Sourcing Request");
  const resolvedSubheading =
    subheading ??
    (isHe
      ? "העלו 1–3 תמונות בנצ'מרק מהמדף, הקליטו תיאור בעברית, או סמנו מפרט מהיר בקליק."
      : "Upload 1–3 photos, speak in Hebrew/English, or tap quick specs below.");

  const activeExamples = isHe ? EXAMPLES_HE : EXAMPLES;
  const activePackaging = isHe ? PACKAGING_PRESETS_HE : PACKAGING_PRESETS;
  const activeDietary = isHe ? DIETARY_PRESETS_HE : DIETARY_PRESETS;
  const activeBrands = isHe ? BENCHMARK_BRAND_SUGGESTIONS_HE : BENCHMARK_BRAND_SUGGESTIONS;
  const activeKosher = isHe ? KOSHER_OPTIONS_HE : KOSHER_OPTIONS;
  const formKey =
    source === "sourcing-page"
      ? "fdx_sourcing_form"
      : source === "buyers-page"
        ? "fdx_buyer_form"
        : source
          ? `fdx_${source}_form`
          : "fdx_buyer_form";

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [descHighlight, setDescHighlight] = useState(false);
  const [category, setCategory] = useState("");
  const [kosher, setKosher] = useState<KosherOption>("chief-rabbinate");
  const [volume, setVolume] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<(typeof VOLUME_UNIT_OPTIONS)[number]["value"]>("tons");
  const [packaging, setPackaging] = useState("");
  const [privateLabel, setPrivateLabel] = useState(true);
  const [brandingMode, setBrandingMode] = useState<BrandingMode>("private_label");
  const [benchmarkBrand, setBenchmarkBrand] = useState("");
  const [unitWeight, setUnitWeight] = useState("");
  const [productCount, setProductCount] = useState("1 single product");
  const [dietaryClaims, setDietaryClaims] = useState<string[]>([]);

  // Voice Narration state (Hebrew / English Web Speech API)
  const [voiceLang, setVoiceLang] = useState<"he-IL" | "en-US">("he-IL");
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // AI Concierge & Seller Brief state (Seller Brief is persisted to Admin)
  const [conciergeLoading, setConciergeLoading] = useState(false);
  const [conciergeData, setConciergeData] = useState<ConciergeResponse | null>(null);
  const [sellerBriefText, setSellerBriefText] = useState("");
  const lastAnalyzedImagesRef = useRef<string>("");

  // Contact & Submission state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState("");
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [urls, setUrls] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefillTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(formKey);

      if (saved) {
        const parsed = JSON.parse(saved) as StoredFormData;

        if (parsed.description) setDescription(parsed.description);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.kosher) setKosher(parsed.kosher);
        if (parsed.volume) setVolume(parsed.volume);
        if (parsed.volumeUnit) setVolumeUnit(parsed.volumeUnit as (typeof VOLUME_UNIT_OPTIONS)[number]["value"]);
        if (parsed.packaging) setPackaging(parsed.packaging);
        if (parsed.privateLabel !== undefined) setPrivateLabel(parsed.privateLabel);
        if (parsed.brandingMode) setBrandingMode(parsed.brandingMode);
        if (parsed.benchmarkBrand) setBenchmarkBrand(parsed.benchmarkBrand);
        if (parsed.unitWeight) setUnitWeight(parsed.unitWeight);
        if (parsed.productCount) setProductCount(parsed.productCount);
        if (parsed.dietaryClaims) setDietaryClaims(parsed.dietaryClaims);
        if (parsed.sellerBriefText) setSellerBriefText(parsed.sellerBriefText);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
        if (parsed.company) setCompany(parsed.company);

        const hasData = Boolean(
          parsed.description ||
            parsed.benchmarkBrand ||
            parsed.name ||
            parsed.email ||
            parsed.whatsapp ||
            parsed.company
        );

        if (hasData) setSavedBanner(true);
      } else {
        const cached = localStorage.getItem("fdx_contact_cache");

        if (cached) {
          const contactCache = JSON.parse(cached) as ContactCache;

          if (contactCache.name) setName(contactCache.name);
          if (contactCache.email) setEmail(contactCache.email);
          if (contactCache.whatsapp) setWhatsapp(contactCache.whatsapp);
          if (contactCache.company) setCompany(contactCache.company);
        }
      }
    } catch {
      // Ignore localStorage parsing errors
    }
  }, [formKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    const qsName = params.get("name")?.trim() ?? "";
    const qsEmail = params.get("email")?.trim() ?? "";
    const qsCompany = params.get("company")?.trim() ?? "";

    if (qsName) setName((prev) => prev || qsName);
    if (qsEmail) setEmail((prev) => prev || qsEmail);
    if (qsCompany) setCompany((prev) => prev || qsCompany);
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          formKey,
          JSON.stringify({
            description,
            category,
            kosher,
            volume,
            volumeUnit,
            packaging,
            privateLabel,
            brandingMode,
            benchmarkBrand,
            unitWeight,
            productCount,
            dietaryClaims,
            sellerBriefText,
            name,
            email,
            whatsapp,
            company,
          } satisfies StoredFormData)
        );
      } catch {
        // Ignore localStorage write errors
      }
    }, 400);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [
    formKey,
    description,
    category,
    kosher,
    volume,
    volumeUnit,
    packaging,
    privateLabel,
    brandingMode,
    benchmarkBrand,
    unitWeight,
    productCount,
    dietaryClaims,
    sellerBriefText,
    name,
    email,
    whatsapp,
    company,
  ]);

  useEffect(() => {
    if (initialDescription && !description) {
      setDescription(initialDescription);
    }
  }, [initialDescription, description]);

  useEffect(() => {
    return () => {
      if (prefillTimer.current) clearInterval(prefillTimer.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Run AI Concierge & Brief Generator
  const runConciergeAnalysis = useCallback(
    async (overrides?: {
      desc?: string;
      brand?: string;
      pkg?: string;
      weight?: string;
      count?: string;
      branding?: BrandingMode;
      kosherOpt?: KosherOption;
      claims?: string[];
      imgUrls?: string[];
    }) => {
      const currentDesc = overrides?.desc ?? description;
      const currentBrand = overrides?.brand ?? benchmarkBrand;
      const currentPkg = overrides?.pkg ?? packaging;
      const currentWeight = overrides?.weight ?? unitWeight;
      const currentCount = overrides?.count ?? productCount;
      const currentBranding = overrides?.branding ?? brandingMode;
      const currentKosher = overrides?.kosherOpt ?? kosher;
      const currentClaims = overrides?.claims ?? dietaryClaims;
      const currentImgUrls =
        overrides?.imgUrls ??
        images.filter((img) => !img.uploading && !img.error && img.url).map((img) => img.url);

      if (currentImgUrls.length === 0 && !currentDesc.trim() && !currentBrand.trim()) {
        return;
      }

      setConciergeLoading(true);
      try {
        const res = await fetch("/api/sourcing/concierge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrls: currentImgUrls,
            description: currentDesc,
            selectedSpecs: {
              benchmarkBrand: currentBrand || undefined,
              packagingFormat: currentPkg || undefined,
              unitWeight: currentWeight || undefined,
              productCount: currentCount || undefined,
              brandingMode: currentBranding,
              kosherLevel: KOSHER_CERTS[currentKosher]?.[0] ?? "No kosher required",
              dietaryClaims: currentClaims,
              annualVolume: volume ? `${volume} ${volumeUnit}` : undefined,
            },
          }),
        });

        const data = (await res.json()) as ConciergeResponse;
        if (data.ok) {
          setConciergeData(data);
          if (data.sellerBrief?.fullFormattedBrief) {
            setSellerBriefText(data.sellerBrief.fullFormattedBrief);
          }
          // Auto-populate empty form fields from AI extraction
          if (!currentBrand && data.extractedSpecs.benchmarkBrand) {
            setBenchmarkBrand(data.extractedSpecs.benchmarkBrand);
          }
          if (!currentPkg && data.extractedSpecs.packagingFormat) {
            setPackaging(
              [data.extractedSpecs.packagingFormat, data.extractedSpecs.dispenserHardware]
                .filter(Boolean)
                .join(" + ")
            );
          }
          if (!currentWeight && data.extractedSpecs.unitWeight) {
            setUnitWeight(data.extractedSpecs.unitWeight);
          }
          if (!category && data.extractedSpecs.categoryName && CATEGORY_OPTIONS.includes(data.extractedSpecs.categoryName)) {
            setCategory(data.extractedSpecs.categoryName);
          }
          if (data.extractedSpecs.dietaryClaims?.length) {
            setDietaryClaims((prev) =>
              Array.from(new Set([...prev, ...data.extractedSpecs.dietaryClaims]))
            );
          }
          if (!currentDesc.trim() && data.extractedSpecs.productName) {
            const autoDesc = [
              data.extractedSpecs.productName,
              data.extractedSpecs.benchmarkBrand
                ? `(Benchmark: ${data.extractedSpecs.benchmarkBrand})`
                : "",
              data.extractedSpecs.packagingFormat ?? "",
              data.extractedSpecs.unitWeight ?? "",
            ]
              .filter(Boolean)
              .join(" · ");
            setDescription(autoDesc);
          }
        }
      } catch (err) {
        console.warn("Concierge analysis failed:", err);
      } finally {
        setConciergeLoading(false);
      }
    },
    [
      description,
      benchmarkBrand,
      packaging,
      unitWeight,
      productCount,
      brandingMode,
      kosher,
      dietaryClaims,
      images,
      volume,
      volumeUnit,
      category,
    ]
  );

  // Automatically trigger AI Concierge when benchmark photos finish uploading
  useEffect(() => {
    const readyUrls = images
      .filter((img) => !img.uploading && !img.error && img.url)
      .map((img) => img.url);
    const anyStillUploading = images.some((img) => img.uploading);

    if (readyUrls.length > 0 && !anyStillUploading) {
      const signature = readyUrls.join("|");
      if (signature !== lastAnalyzedImagesRef.current) {
        lastAnalyzedImagesRef.current = signature;
        void runConciergeAnalysis({ imgUrls: readyUrls });
      }
    }
  }, [images, runConciergeAnalysis]);

  // Voice Narration handler (Web Speech API supporting Hebrew עברית & English)
  function toggleVoiceRecording() {
    setVoiceError(null);

    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
      setInterimTranscript("");
      setTimeout(() => {
        void runConciergeAnalysis();
      }, 300);
      return;
    }

    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice narration is supported in Chrome, Edge, and Safari. Please type or use one of those browsers.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.continuous = true;
      recognition.interimResults = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + " ";
          } else {
            interimChunk += transcript;
          }
        }
        if (finalChunk) {
          setDescription((prev) => {
            const sep = prev && !prev.endsWith(" ") ? " " : "";
            return (prev + sep + finalChunk).trimStart();
          });
          clearFieldError("description");
        }
        setInterimTranscript(interimChunk);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          setVoiceError(`Microphone notice: ${e.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch {
      setVoiceError("Could not start microphone. Please allow microphone access in your browser.");
    }
  }

  function handleChipAnswer(question: ConciergeQuestion, option: string) {
    switch (question.id) {
      case "benchmarkBrand": {
        const cleaned = option.replace(/^Similar to\s+/i, "").trim();
        setBenchmarkBrand(cleaned);
        void runConciergeAnalysis({ brand: cleaned });
        break;
      }
      case "packagingFormat": {
        setPackaging(option);
        void runConciergeAnalysis({ pkg: option });
        break;
      }
      case "unitWeight": {
        setUnitWeight(option);
        void runConciergeAnalysis({ weight: option });
        break;
      }
      case "productCount": {
        setProductCount(option);
        void runConciergeAnalysis({ count: option });
        break;
      }
      case "brandingMode": {
        const lower = option.toLowerCase();
        const mode: BrandingMode = lower.includes("private")
          ? "private_label"
          : lower.includes("supplier") || lower.includes("manufacturer")
            ? "supplier_brand"
            : "both";
        setBrandingMode(mode);
        setPrivateLabel(mode === "private_label");
        void runConciergeAnalysis({ branding: mode });
        break;
      }
      case "kosherLevel": {
        const lower = option.toLowerCase();
        const nextKosher: KosherOption = lower.includes("badatz")
          ? "badatz"
          : lower.includes("mehadrin")
            ? "mehadrin"
            : lower.includes("rabbinate") || lower.includes("rabbanut")
              ? "chief-rabbinate"
              : lower.includes("no") || lower.includes("none")
                ? "none"
                : "any";
        setKosher(nextKosher);
        void runConciergeAnalysis({ kosherOpt: nextKosher });
        break;
      }
      case "dietaryClaims": {
        const nextClaims = dietaryClaims.includes(option)
          ? dietaryClaims.filter((c) => c !== option)
          : [...dietaryClaims, option];
        setDietaryClaims(nextClaims);
        void runConciergeAnalysis({ claims: nextClaims });
        break;
      }
    }
  }

  function toggleDietaryClaim(claim: string) {
    setDietaryClaims((prev) =>
      prev.includes(claim) ? prev.filter((c) => c !== claim) : [...prev, claim]
    );
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function clearForm() {
    setDescription("");
    setCategory("");
    setKosher("chief-rabbinate");
    setVolume("");
    setVolumeUnit("tons");
    setPackaging("");
    setPrivateLabel(true);
    setBrandingMode("private_label");
    setBenchmarkBrand("");
    setUnitWeight("");
    setProductCount("1 single product");
    setDietaryClaims([]);
    setConciergeData(null);
    setSellerBriefText("");
    setImages([]);
    setUrls([""]);
    setSavedBanner(false);
    setFieldErrors({});
    setError(null);
    lastAnalyzedImagesRef.current = "";

    try {
      localStorage.removeItem(formKey);
    } catch {
      // Ignore localStorage errors
    }
  }

  function handleSameCategory() {
    setDescription("");
    setImages([]);
    setUrls([""]);
    setVolume("");
    setVolumeUnit("tons");
    setPackaging("");
    setBenchmarkBrand("");
    setUnitWeight("");
    setConciergeData(null);
    setSellerBriefText("");
    setSubmitted(false);
    setShowAddAnother(false);
    setFieldErrors({});
    setError(null);
    lastAnalyzedImagesRef.current = "";

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDifferentProduct() {
    clearForm();
    setSubmitted(false);
    setShowAddAnother(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addUrlInput() {
    setUrls((prev) => (prev.length < 5 ? [...prev, ""] : prev));
  }

  function removeUrlInput(index: number) {
    setUrls((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateUrl(index: number, value: string) {
    setUrls((prev) => prev.map((url, idx) => (idx === index ? value : url)));
  }

  function prefill(example: ExampleRequest) {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setKosher(example.kosher);
    if (example.benchmarkBrand) setBenchmarkBrand(example.benchmarkBrand);
    if (example.packaging) setPackaging(example.packaging);
    if (example.unitWeight) setUnitWeight(example.unitWeight);
    if (example.brandingMode) {
      setBrandingMode(example.brandingMode);
      setPrivateLabel(example.brandingMode === "private_label");
    }
    if (example.dietaryClaims) setDietaryClaims(example.dietaryClaims);
    setDescription("");

    if (prefillTimer.current) clearInterval(prefillTimer.current);

    let i = 0;
    const text = example.description;

    prefillTimer.current = setInterval(() => {
      setDescription(text.slice(0, i + 1));
      i += 1;

      if (i >= text.length && prefillTimer.current) {
        clearInterval(prefillTimer.current);
        prefillTimer.current = null;
        void runConciergeAnalysis({
          desc: text,
          brand: example.benchmarkBrand ?? benchmarkBrand,
          pkg: example.packaging ?? packaging,
          weight: example.unitWeight ?? unitWeight,
          branding: example.brandingMode ?? brandingMode,
          kosherOpt: example.kosher,
          claims: example.dietaryClaims ?? dietaryClaims,
        });
      }
    }, 18);

    setDescHighlight(true);
    window.setTimeout(() => setDescHighlight(false), 1400);
  }

  function validateField(field: "description" | "name" | "email" | "whatsapp" | "company") {
    setFieldErrors((prev) => {
      const next = { ...prev };

      switch (field) {
        case "description":
          if (!description.trim() && images.length === 0 && !benchmarkBrand.trim()) {
            next.description = "Please upload a benchmark photo, speak your request, or describe the product";
          } else {
            delete next.description;
          }
          break;

        case "name":
          if (!isValidName(name)) {
            next.name = "Please enter your real name (first name is fine)";
          } else {
            delete next.name;
          }
          break;

        case "email":
          if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
            next.email = "Please enter a valid email address";
          } else if (!email.trim() && !whatsapp.trim()) {
            next.email = "Please provide an email or WhatsApp number so we can reach you";
          } else {
            delete next.email;
            if (next.whatsapp === "Please provide an email or WhatsApp number so we can reach you") {
              delete next.whatsapp;
            }
          }
          break;

        case "whatsapp":
          if (whatsapp.trim() && !isValidPhoneNumber(whatsapp)) {
            next.whatsapp = "Please enter a valid WhatsApp number including country code";
          } else if (!whatsapp.trim() && !email.trim()) {
            next.whatsapp = "Please provide an email or WhatsApp number so we can reach you";
          } else {
            delete next.whatsapp;
            if (next.email === "Please provide an email or WhatsApp number so we can reach you") {
              delete next.email;
            }
          }
          break;

        case "company":
          if (company.trim() && !isValidCompanyName(company)) {
            next.company = "Please enter your company name";
          } else {
            delete next.company;
          }
          break;
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: Record<string, string> = {};

    if (!isValidName(name)) {
      errors.name = "Please enter your real name (first name is fine)";
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (whatsapp.trim() && !isValidPhoneNumber(whatsapp)) {
      errors.whatsapp = "Please enter a valid WhatsApp number including country code";
    }

    if (!email.trim() && !whatsapp.trim()) {
      const msg = "Please provide an email or WhatsApp number so we can reach you";
      errors.email = msg;
      errors.whatsapp = msg;
    }

    if (company.trim() && !isValidCompanyName(company)) {
      errors.company = "Please enter your company name";
    }

    if (!description.trim() && images.length === 0 && !benchmarkBrand.trim()) {
      errors.description = "Please upload a benchmark photo, speak your request, or describe the product";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setSubmitting(true);

    const extraUrls = urls.filter((url) => {
      const trimmed = url.trim();
      return trimmed.startsWith("http://") || trimmed.startsWith("https://");
    });

    const specLines: string[] = [];
    if (description.trim()) specLines.push(description.trim());
    if (benchmarkBrand.trim()) specLines.push(`Benchmark Brand Reference: ${benchmarkBrand.trim()}`);
    if (packaging.trim()) specLines.push(`Packaging & Dispensing Format: ${packaging.trim()}`);
    if (unitWeight.trim()) specLines.push(`Unit Weight / Pack Size: ${unitWeight.trim()}`);
    if (productCount.trim()) specLines.push(`Number of Products / Variants: ${productCount.trim()}`);
    if (dietaryClaims.length > 0) specLines.push(`Dietary & Functional Specs: ${dietaryClaims.join(", ")}`);
    if (volume.trim()) {
      const unitLabel =
        VOLUME_UNIT_OPTIONS.find((unit) => unit.value === volumeUnit)?.label ?? "tons / year";
      specLines.push(`Estimated Annual Volume: ${volume.trim()} ${unitLabel}`);
    }

    const fullDescription = specLines.join("\n");
    const resolvedProductName =
      conciergeData?.extractedSpecs?.productName ||
      (benchmarkBrand ? `Product similar to ${benchmarkBrand}` : undefined) ||
      description.trim().slice(0, 80) ||
      undefined;

    const payload = {
      name: name.trim(),
      email: email.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      company: company.trim() || undefined,
      product_name: resolvedProductName,
      description: fullDescription || undefined,
      category: category || conciergeData?.extractedSpecs?.categoryName || undefined,
      certifications: KOSHER_CERTS[kosher],
      dietary_claims: dietaryClaims,
      packaging_preference: [packaging.trim(), unitWeight.trim()].filter(Boolean).join(" · ") || undefined,
      volume_per_year: volume.trim() ? `${volume.trim()} ${volumeUnit}` : undefined,
      benchmark_brand: benchmarkBrand.trim() || undefined,
      seller_brief: sellerBriefText.trim() || undefined,
      private_label:
        brandingMode === "private_label"
          ? true
          : brandingMode === "supplier_brand"
            ? false
            : null,
      image_urls: [
        ...images
          .filter((img) => !img.uploading && !img.error && img.url)
          .map((img) => img.url),
        ...extraUrls,
      ].slice(0, 5),
      ai_analysis: conciergeData
        ? {
            extracted_specs: conciergeData.extractedSpecs,
            completeness_score: conciergeData.completenessScore,
            seller_brief: sellerBriefText || conciergeData.sellerBrief.fullFormattedBrief,
          }
        : undefined,
      source,
    };

    try {
      const res = await fetch("/api/sourcing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as SubmitResponse;

      if (res.status === 429) {
        setError(
          data.message ??
            "You've submitted several requests — please wait a few minutes before submitting again."
        );
        return;
      }

      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      try {
        localStorage.removeItem(formKey);
        localStorage.setItem(
          "fdx_contact_cache",
          JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            whatsapp: whatsapp.trim(),
            company: company.trim(),
          } satisfies ContactCache)
        );
      } catch {
        // Ignore localStorage errors
      }

      if (onSuccess) {
        onSuccess();
        return;
      }

      const shortDescription = resolvedProductName || description.trim().slice(0, 80);

      setSubmittedSummary(
        category ? `${category}${shortDescription ? `: ${shortDescription}` : ""}` : shortDescription
      );

      setSubmitted(true);
      window.setTimeout(() => setShowAddAnother(true), 1500);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const anyUploading = images.some((img) => img.uploading);

  return (
    <div ref={formRef} className="space-y-6" dir={isHe ? "rtl" : "ltr"}>
      {showExamples && (
        <section className="border-b border-dark-border px-6 py-5 bg-slate-950/30">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                {isHe ? "מילוי מהיר לדוגמה:" : "Quick-Fill Example:"}
              </span>
              {activeExamples.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => prefill(example)}
                  className="rounded-full border border-white/10 bg-[#0f172a] px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300"
                >
                  {example.title}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {!compact && (
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-dark-text-primary">{resolvedHeading}</h2>
              {resolvedSubheading && <p className="mt-1 text-xs text-slate-400">{resolvedSubheading}</p>}
            </div>
          )}

          {submitted ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-6 py-10 text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500"
                style={{ animation: "pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" }}
              >
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="mb-1.5 text-lg font-semibold text-dark-text-primary">
                {isHe
                  ? "בקשת הרכש התקבלה — מאתרים יצרנים מתאימים כעת"
                  : "Request Received — Matching Manufacturers Now"}
              </h3>

              <p className="mb-4 text-xs text-slate-300">
                {isHe
                  ? "אנו סורקים את המפרט שלך מול מעל 600 יצרני מזון מאושרים באירופה ונחזור אליך אישית בתוך 24 שעות."
                  : "We are matching your specs across 25,000+ verified products and will reach out with qualified suppliers."}
              </p>

              {submittedSummary && (
                <p className="mb-5 text-xs italic text-slate-300">
                  &ldquo;{submittedSummary}&rdquo;
                </p>
              )}

              <button
                type="button"
                onClick={handleDifferentProduct}
                className="btn-brand rounded-lg px-6 py-2.5 text-sm"
              >
                {isHe ? "הגשת בקשה למוצר נוסף" : "Submit another request"}
              </button>

              <div
                className={`transition-all duration-700 ${
                  showAddAnother ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
                }`}
              >
                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleSameCategory}
                    className="rounded-lg border border-white/20 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                  >
                    {isHe ? "+ הוסף מוצר נוסף באותה קטגוריה" : "+ Add another product in same category"}
                  </button>
                </div>

                <a href={isHe ? "/he" : "/"} className="mt-5 block text-xs text-slate-500 transition hover:text-slate-300">
                  {isHe ? "← חזרה לדף הבית" : "← Back to homepage"}
                </a>
              </div>

              <style>{`@keyframes pop{0%{transform:scale(0)}80%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {savedBanner && (
                <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs">
                  <span className="text-slate-300">{isHe ? "טיוטה שוחזרה מהזיכרון" : "Draft restored"}</span>
                  <button
                    type="button"
                    onClick={() => setSavedBanner(false)}
                    className="ml-3 shrink-0 text-base leading-none text-slate-500 hover:text-slate-300"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* ── STEP 1: BENCHMARK PHOTOS ── */}
              <SectionHeader
                n={1}
                title={isHe ? "תמונות בנצ'מרק מהמדף (1–3 תמונות)" : "Benchmark Photos (1–3 Images)"}
                badge={isHe ? "מומלץ מאוד" : "Recommended"}
                first
              />

              <FieldGroup>
                <MultiImageUpload value={images} onChange={setImages} maxImages={3} bucket="requests" lang={lang} />
                <p className="text-[11px] text-slate-400">
                  {isHe
                    ? "① תווית קדמית / מותג · ② סוג אריזה / משאבה · ③ רכיבים / כשרות ומשקל"
                    : "① Front / Brand · ② Packaging / Pump · ③ Ingredients / Kosher"}
                </p>
              </FieldGroup>

              {/* ── STEP 2: VOICE OR TEXT + BENCHMARK BRAND ── */}
              <SectionHeader
                n={2}
                title={isHe ? "הקלטה קולית או תיאור חופשי" : "Speak or Describe Product"}
                badge="עברית / English"
              />

              {/* Compact Voice + Description Card */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0b1324] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    {isHe ? "🎙️ הקלטה קולית בעברית או תיאור חופשי" : "🎙️ Voice Narration or Text"}
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-white/10 bg-slate-950 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setVoiceLang("he-IL")}
                        className={`rounded-md px-2 py-1 font-medium transition ${
                          voiceLang === "he-IL"
                            ? "bg-orange-500 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        🇮🇱 עברית
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceLang("en-US")}
                        className={`rounded-md px-2 py-1 font-medium transition ${
                          voiceLang === "en-US"
                            ? "bg-orange-500 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        🇬🇧 EN
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={toggleVoiceRecording}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isRecording
                          ? "animate-pulse bg-red-500 text-white"
                          : "bg-orange-500 text-white hover:bg-orange-400"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-white" />
                      {isRecording ? (isHe ? "עצור" : "Stop") : (isHe ? "הקלט" : "Speak")}
                    </button>

                    <button
                      type="button"
                      onClick={() => void runConciergeAnalysis()}
                      disabled={conciergeLoading || (!description.trim() && images.length === 0 && !benchmarkBrand.trim())}
                      className="rounded-lg border border-orange-500/40 bg-orange-500/15 px-2.5 py-1.5 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/25 disabled:opacity-40"
                    >
                      {conciergeLoading ? (isHe ? "✨ בודק מפרט..." : "✨ Analyzing...") : (isHe ? "✨ בדיקת AI" : "✨ AI Check")}
                    </button>
                  </div>
                </div>

                {isRecording && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
                    🔴 {voiceLang === "he-IL" ? "מקשיב בעברית..." : "Listening..."}
                    {interimTranscript && <span className="ml-2 italic text-white">&ldquo;{interimTranscript}&rdquo;</span>}
                  </div>
                )}

                {voiceError && <p className="text-xs text-amber-400">{voiceError}</p>}

                <textarea
                  id="description"
                  ref={descRef}
                  rows={3}
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    clearFieldError("description");
                  }}
                  onBlur={() => {
                    validateField("description");
                    if (description.trim().length > 12 && !conciergeData && !conciergeLoading) {
                      void runConciergeAnalysis();
                    }
                  }}
                  maxLength={4000}
                  placeholder={
                    isHe
                      ? "לדוגמה: מיונז בסגנון הלמנ'ס, דלי 5 ק״ג לקייטרינג ומסעדות, כשר לפסח, מותג פרטי..."
                      : "e.g. Mayonnaise similar to Hellmann's, 5kg catering plastic box with pump, kosher, private label..."
                  }
                  className={`${inputClass("resize-none")} ${descHighlight ? "border-orange-500/60" : ""}`}
                />
                <FieldError message={fieldErrors.description} />

                {/* Compact Benchmark Brand Input + Chips */}
                <div className="pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="benchmarkBrand"
                      type="text"
                      value={benchmarkBrand}
                      onChange={(e) => setBenchmarkBrand(e.target.value)}
                      placeholder={
                        isHe
                          ? "מותג בנצ'מרק להשוואה (למשל הלמנ'ס, היינץ, מוטי)..."
                          : "Benchmark brand (e.g. Hellmann's, Heinz, Mutti)..."
                      }
                      className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-1">
                      {activeBrands.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => {
                            setBenchmarkBrand(brand);
                            void runConciergeAnalysis({ brand });
                          }}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                            benchmarkBrand.toLowerCase().includes(brand.toLowerCase())
                              ? "border-orange-500 bg-orange-500/20 text-orange-300"
                              : "border-white/10 bg-white/5 text-slate-400 hover:border-white/25 hover:text-slate-200"
                          }`}
                        >
                          +{brand}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── COMPACT AI CONCIERGE CARD ── */}
              {(conciergeLoading || conciergeData) && (
                <div className="rounded-2xl border border-orange-500/35 bg-[#0f172a] p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🤖</span>
                      <span className="text-xs font-bold text-slate-100">
                        {isHe ? "סייר רכש AI חכם" : "AI Sourcing Concierge"}
                      </span>
                      {conciergeData && conciergeData.liveMatchPreview.matchingSuppliersCount > 0 && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                          🎯 {conciergeData.liveMatchPreview.matchingSuppliersCount} {isHe ? "מפעלים מתאימים" : "Factories Ready"}
                        </span>
                      )}
                    </div>

                    {conciergeData && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-orange-400">
                          {conciergeData.completenessScore}%
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${conciergeData.completenessScore}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {conciergeLoading ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                      <svg className="h-4 w-4 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {isHe ? "בודק מפרט..." : "Checking specs..."}
                    </div>
                  ) : conciergeData ? (
                    <div className="mt-2.5 space-y-2.5">
                      {conciergeData.extractedSpecs.englishTranslation && (
                        <p className="text-[11px] text-blue-300">
                          🌐 &ldquo;{conciergeData.extractedSpecs.englishTranslation}&rdquo;
                        </p>
                      )}

                      {conciergeData.missingQuestions.length > 0 && (
                        <div className="space-y-2">
                          {conciergeData.missingQuestions.map((q) => (
                            <div
                              key={q.id}
                              className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5"
                            >
                              <p className="mb-1.5 text-xs font-medium text-slate-200">{q.question}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {q.options.map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleChipAnswer(q, opt)}
                                    className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-medium text-orange-200 transition hover:border-orange-400 hover:bg-orange-500/25"
                                  >
                                    + {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── STEP 3: QUICK SPECS (1-CLICK CHIPS) ── */}
              <SectionHeader
                n={3}
                title={isHe ? "מפרט מוצר מהיר" : "Quick Product Specs"}
                badge={isHe ? "קליק 1" : "1-Click"}
              />

              {/* Branding Mode Toggle */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "private_label" as const, label: isHe ? "🏷️ מותג פרטי (PL)" : "🏷️ Private Label" },
                  { value: "supplier_brand" as const, label: isHe ? "🏭 מותג יצרן" : "🏭 Supplier Brand" },
                  { value: "both" as const, label: isHe ? "🤝 שניהם אפשריים" : "🤝 Either / Both" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setBrandingMode(item.value);
                      setPrivateLabel(item.value === "private_label");
                    }}
                    className={`rounded-xl border py-2.5 px-3 text-center text-xs font-semibold transition ${
                      brandingMode === item.value
                        ? "border-orange-500 bg-orange-500/15 text-orange-200"
                        : "border-white/10 bg-[#0f172a] text-slate-300 hover:border-white/25"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Packaging & Hardware */}
              <FieldGroup>
                <Label htmlFor="packaging">{isHe ? "אריזה ואופן הגשה / דיספנסר" : "Packaging & Dispenser Format"}</Label>
                <input
                  id="packaging"
                  type="text"
                  value={packaging}
                  onChange={(event) => setPackaging(event.target.value)}
                  placeholder={
                    isHe
                      ? "למשל: דלי 5 ק״ג + משאבה, בקבוק לחיץ 400 מ״ל, צנצנת זכוכית, שקיקים אישיים..."
                      : "e.g. 5kg catering box + pump, squeeze bottle, glass jar, sachets..."
                  }
                  className={inputClass("py-2.5")}
                />
                <div className="flex flex-wrap gap-1.5">
                  {activePackaging.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPackaging(preset)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
                        packaging === preset
                          ? "border-orange-500 bg-orange-500/20 text-orange-300"
                          : "border-white/10 bg-white/5 text-slate-400 hover:border-white/25 hover:text-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {/* Weight & SKU Count */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldGroup>
                  <Label htmlFor="unitWeight">{isHe ? "משקל / נפח יחידה" : "Unit Weight / Size"}</Label>
                  <input
                    id="unitWeight"
                    type="text"
                    value={unitWeight}
                    onChange={(e) => setUnitWeight(e.target.value)}
                    placeholder={isHe ? "למשל: 5 ק״ג, 400 גרם, 750 מ״ל, 10 גרם" : "e.g. 5kg, 400g, 750ml, 10g"}
                    className={inputClass("py-2.5")}
                  />
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="productCount">{isHe ? "מספר מק״טים מבוקש" : "Number of Products"}</Label>
                  <select
                    id="productCount"
                    value={productCount}
                    onChange={(e) => setProductCount(e.target.value)}
                    className={inputClass("py-2.5")}
                  >
                    <option value="1 single product">{isHe ? "מוצר בודד (מק״ט יחיד)" : "1 Product (Single SKU)"}</option>
                    <option value="2–3 pack sizes / variants">{isHe ? "2–3 גדלים / טעמים" : "2–3 Products / Variants"}</option>
                    <option value="Full range (4+ SKUs / flavours)">{isHe ? "סדרה מלאה (4+ מק״טים)" : "4+ Products (Full Line)"}</option>
                  </select>
                </FieldGroup>
              </div>

              {/* Dietary & Functional Chips */}
              <FieldGroup>
                <Label>{isHe ? "דרישות תזונתיות ותוויות איכות" : "Dietary & Health Claims"}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {activeDietary.map((claim) => {
                    const active = dietaryClaims.includes(claim);
                    return (
                      <button
                        key={claim}
                        type="button"
                        onClick={() => toggleDietaryClaim(claim)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                            : "border-white/10 bg-[#0f172a] text-slate-400 hover:border-white/25 hover:text-slate-200"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {claim}
                      </button>
                    );
                  })}
                </div>
              </FieldGroup>

              {/* Kosher, Category & Volume in a compact grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FieldGroup>
                  <Label htmlFor="kosherSelect">{isHe ? "כשרות" : "Kosher"}</Label>
                  <select
                    id="kosherSelect"
                    value={kosher}
                    onChange={(e) => setKosher(e.target.value as KosherOption)}
                    className={inputClass("py-2.5")}
                  >
                    {activeKosher.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="category">{isHe ? "קטגוריה" : "Category"}</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={inputClass("py-2.5")}
                  >
                    <option value="">{isHe ? "זיהוי אוטומטי (AI)" : "Auto-detect (AI)"}</option>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="volume">{isHe ? "צפי נפח שנתי" : "Annual Volume"}</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="volume"
                      type="number"
                      min={1}
                      max={99999}
                      value={volume}
                      onChange={(event) => setVolume(event.target.value)}
                      placeholder="20"
                      className={inputClass("py-2.5 px-3")}
                    />
                    <select
                      value={volumeUnit}
                      onChange={(event) =>
                        setVolumeUnit(event.target.value as (typeof VOLUME_UNIT_OPTIONS)[number]["value"])
                      }
                      className={inputClass("py-2.5 px-2 text-xs")}
                      aria-label={isHe ? "יחידת מידה לנפח" : "Volume unit"}
                    >
                      {VOLUME_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {isHe
                            ? option.value === "containers"
                              ? "מכולות בשנה (Containers)"
                              : option.value === "pallets"
                              ? "משטחים בשנה (Pallets)"
                              : option.value === "tons"
                              ? "טונות בשנה (Tons)"
                              : option.value === "kg"
                              ? "ק״ג בשנה (Kg)"
                              : "יחידות בשנה (Units)"
                            : option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </FieldGroup>
              </div>

              {/* ── STEP 4: BUYER CONTACT DETAILS ── */}
              <SectionHeader
                n={4}
                title={isHe ? "לאן לשלוח את הצעות המפעלים המתאימים?" : "Where Should We Send Your Matches?"}
              />

              <ContactFields
                lang={lang}
                name={name}
                onNameChange={(value) => {
                  setName(value);
                  clearFieldError("name");
                }}
                onNameBlur={() => validateField("name")}
                company={company}
                onCompanyChange={(value) => {
                  setCompany(value);
                  clearFieldError("company");
                }}
                onCompanyBlur={() => validateField("company")}
                whatsapp={whatsapp}
                onWhatsappChange={(value) => {
                  setWhatsapp(value);
                  clearFieldError("whatsapp");
                }}
                onWhatsappBlur={() => validateField("whatsapp")}
                email={email}
                onEmailChange={(value) => {
                  setEmail(value);
                  clearFieldError("email");
                }}
                onEmailBlur={() => validateField("email")}
                errors={fieldErrors}
                defaultCountry="IL"
                companyOptional
              />

              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="sticky bottom-0 z-20 -mx-6 mt-2 border-t border-white/10 bg-dark-900/95 px-6 py-3 backdrop-blur sm:-mx-8 sm:px-8">
                <button
                  type="submit"
                  disabled={submitting || anyUploading}
                  className="btn-brand w-full justify-center rounded-xl py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {isHe ? "מאתר יצרנים מתאימים..." : "Matching Suppliers..."}
                    </>
                  ) : anyUploading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {isHe ? "מעלה תמונות..." : "Uploading photos..."}
                    </>
                  ) : (
                    isHe ? "שליחת בקשת רכש ואיתור מפעלים מתאימים ←" : "Match Verified Manufacturers →"
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={clearForm}
                className="mx-auto block text-center text-xs text-slate-500 hover:text-slate-300"
              >
                {isHe ? "איפוס הטופס" : "Clear form"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}