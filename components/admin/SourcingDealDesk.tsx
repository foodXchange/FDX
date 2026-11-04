"use client";

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createRequestForBuyer,
  createQuickBuyer,
  type CreateQuickBuyerInput,
  getQuickMatchesAction,
  rerunMatchingAction,
  sendBriefConfirmationEmailAction,
  saveDraftRequestAction,
  softDeleteRequestAction,
  updateBriefStatusAction,
  runLayeredAnalysisAction,
  createBriefTokenAction,
  adminOverrideConfirmBriefAction,
} from "@/app/admin/requests/actions";
import type { LayeredAnalysisResult, LayeredProductCard } from "@/lib/ai/layeredAnalysis";
import type { RequestRow } from "@/app/admin/requests/page";
import RequestsTable from "@/components/admin/RequestsTable";
import AgentCommandRadar from "@/components/admin/AgentCommandRadar";
import PipelineStageSelector from "@/components/admin/PipelineStageSelector";

export type BuyerOption = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_whatsapp?: string | null;
  country?: string | null;
  buyer_type?: string | null;
  website?: string | null;
};

interface Props {
  buyers: BuyerOption[];
  requests: RequestRow[];
  initialEditId?: string;
  /** "registry" opens the Requests Registry view (URL: /admin/requests?view=registry) */
  initialView?: "desk" | "registry";
  /** Pre-select a buyer for a fresh request (URL: /admin/requests?buyer_id=...) */
  initialBuyerId?: string;
  initialCounts: {
    total: number;
    matched: number;
    unmatched: number;
    highScore: number;
    awaiting: number;
  };
}

const COMMON_DIETARY_TAGS = [
  "Gluten Free",
  "Sugar Free",
  "Keto Friendly",
  "Kosher (Chief Rabbinate)",
  "Kosher (Badatz)",
  "BRC",
  "IFS",
  "Organic",
  "Vegan",
  "Non-GMO",
];

const CATEGORY_PRESETS = [
  "Savory Snacks & Cereals",
  "Sweet Biscuits & Bars",
  "Confectionery & Chocolate",
  "Canned Goods & Tomatoes",
  "Dairy & Plant-Based Analogues",
  "Pasta & Noodles",
  "Oils, Fats & Condiments",
  "Beverages",
  "Other Specialty",
];

const PACKAGING_FORMAT_PRESETS = [
  "Stand-up Pouch",
  "Pillow Bag",
  "Glass Jar",
  "PET Bottle",
  "Tetra Pak",
  "Tin Can",
  "Carton Box",
  "Flow Pack",
  "Tub / Cup",
];

function getProducerRegionBadge(country?: string | null): { label: string; cls: string } {
  if (!country || !country.trim()) {
    return { label: "New Unverified Producer", cls: "bg-slate-200 text-slate-700" };
  }
  const c = country.toLowerCase().trim();

  const europe = [
    "belgium", "italy", "spain", "france", "germany", "netherlands", "poland", "greece",
    "uk", "united kingdom", "austria", "portugal", "switzerland", "croatia", "czech",
    "slovakia", "denmark", "sweden", "finland", "ireland", "hungary", "romania", "bulgaria"
  ];
  const americas = [
    "usa", "united states", "canada", "mexico", "brazil", "argentina", "chile",
    "colombia", "peru", "ecuador", "uruguay"
  ];
  const asia = [
    "china", "india", "vietnam", "thailand", "indonesia", "turkey", "japan",
    "korea", "malaysia", "philippines"
  ];
  const middleEast = ["israel", "jordan", "egypt", "uae", "saudi arabia"];

  if (europe.some((e) => c.includes(e))) {
    return { label: `New European Producer (${country})`, cls: "bg-blue-100 text-blue-800 border border-blue-200" };
  }
  if (americas.some((a) => c.includes(a))) {
    return { label: `New Americas Producer (${country})`, cls: "bg-amber-100 text-amber-800 border border-amber-200" };
  }
  if (asia.some((a) => c.includes(a))) {
    return { label: `New Asian Producer (${country})`, cls: "bg-purple-100 text-purple-800 border border-purple-200" };
  }
  if (middleEast.some((m) => c.includes(m))) {
    return { label: `New Middle East Producer (${country})`, cls: "bg-emerald-100 text-emerald-800 border border-emerald-200" };
  }

  return { label: `New Producer (${country})`, cls: "bg-slate-200 text-slate-700" };
}

export default function SourcingDealDesk({
  buyers: initialBuyers,
  requests,
  initialEditId,
  initialView = "desk",
  initialBuyerId,
  initialCounts,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active View mode: Unified Split-Screen vs Full Tabular Registry
  // The view is mirrored in the URL (?view=registry) so it can be opened from the
  // sidebar menu, bookmarked, and navigated with the browser Back/Forward buttons.
  const [activeTab, setActiveTab] = useState<"intake_desk" | "registry_table">(
    initialView === "registry" && !initialEditId ? "registry_table" : "intake_desk"
  );

  function switchTab(tab: "intake_desk" | "registry_table") {
    setActiveTab(tab);
    try {
      const params = new URLSearchParams(window.location.search);
      if (tab === "registry_table") {
        params.set("view", "registry");
      } else {
        params.delete("view");
      }
      const qs = params.toString();
      const nextUrl = `/admin/requests${qs ? `?${qs}` : ""}`;
      if (nextUrl !== window.location.pathname + window.location.search) {
        window.history.pushState(null, "", nextUrl);
      }
    } catch {}
    window.scrollTo({ top: 0 });
  }

  // Keep the view in sync with the URL: sidebar links (?view=registry), browser Back/Forward,
  // and our own pushState calls all update the search params.
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");
  useEffect(() => {
    setActiveTab(urlView === "registry" ? "registry_table" : "intake_desk");
  }, [urlView]);

  // 1. Collapsible 5-Step Funnel State
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true, // Step 1: Buyer Intake
    2: true, // Step 2: Request Scope & Reference Visuals
    3: true, // Step 3: Layered AI Analysis & Catalog Matches
    4: true, // Step 4: Sourcing Brief Draft
    5: true, // Step 5: Buyer Confirmation Hub & Matching Lock
  });

  function toggleSection(step: number) {
    setOpenSections((prev) => ({ ...prev, [step]: !prev[step] }));
  }

  function expandAll() {
    setOpenSections({ 1: true, 2: true, 3: true, 4: true, 5: true });
  }

  function collapseAll() {
    setOpenSections({ 1: false, 2: false, 3: false, 4: false, 5: false });
  }

  // 2. Buyer Selection State
  const [buyersList, setBuyersList] = useState<BuyerOption[]>(initialBuyers);
  const [buyerSearchQuery, setBuyerSearchQuery] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(null);
  const [showQuickAddBuyer, setShowQuickAddBuyer] = useState(false);
  const [quickBuyerPending, setQuickBuyerPending] = useState(false);
  const [quickBuyerError, setQuickBuyerError] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState<CreateQuickBuyerInput>({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_whatsapp: "",
    country: "Israel",
    buyer_type: "importer",
    website: "",
  });

  const filteredBuyers = useMemo(() => {
    if (!buyerSearchQuery.trim()) return buyersList.slice(0, 8);
    const q = buyerSearchQuery.toLowerCase();
    return buyersList
      .filter(
        (b) =>
          b.company_name.toLowerCase().includes(q) ||
          (b.contact_name && b.contact_name.toLowerCase().includes(q)) ||
          (b.website && b.website.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [buyersList, buyerSearchQuery]);

  // 3. Project & Sourcing Form State
  const [projectTitle, setProjectTitle] = useState("");
  const [benchmarkBrands, setBenchmarkBrands] = useState("");
  const [category, setCategory] = useState("");
  const [packagingFormat, setPackagingFormat] = useState("Retail Shelf Packs (Consolidated Mixed Container)");
  const [estimatedVolume, setEstimatedVolume] = useState("1 x 40ft HQ FCL / month (Mixed Pallets)");
  const [brandingModel, setBrandingModel] = useState<"supplier_brand" | "private_label" | "open">("supplier_brand");
  const [targetMarket, setTargetMarket] = useState("Israel");
  const [temperatureRegime, setTemperatureRegime] = useState<"ambient" | "chilled" | "frozen">("ambient");
  const [targetWeightMinG, setTargetWeightMinG] = useState<string>("");
  const [targetWeightMaxG, setTargetWeightMaxG] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Gluten Free",
    "Sugar Free",
    "Kosher (Chief Rabbinate)",
    "BRC",
  ]);
  const [naturalBrief, setNaturalBrief] = useState("");

  // 4. Machine Vision, Upload & Layered Analysis State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [analysingVision, setAnalysingVision] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pasteUrlInput, setPasteUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [visionSummary, setVisionSummary] = useState<string | null>(null);
  const [layeredAnalysis, setLayeredAnalysis] = useState<LayeredAnalysisResult | null>(null);

  // 5. Brief Status & Buyer Confirmation State
  const [briefStatus, setBriefStatus] = useState<
    "draft" | "sent" | "changes_requested" | "confirmed" | "reconfirm_needed"
  >("draft");
  const [briefVersion, setBriefVersion] = useState(1);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailCustomNotes, setEmailCustomNotes] = useState("");

  // Admin Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState("");
  const [isOverridingConfirm, setIsOverridingConfirm] = useState(false);

  // Copy Public Brief Link
  const [copiedLinkNotice, setCopiedLinkNotice] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Pipeline Stage State
  const [activePipelineStage, setActivePipelineStage] = useState<string>("stage_1_brief");
  const [activeExceptionStatus, setActiveExceptionStatus] = useState<string | null>(null);

  // Draft Saving & Persistence state
  const [savedDraftNotice, setSavedDraftNotice] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveToast, setSaveToast] = useState<{
    visible: boolean;
    savedAt: string;
    requestId?: string | null;
    briefStatus: "draft" | "sent" | "changes_requested" | "confirmed" | "reconfirm_needed";
    projectTitle: string;
    buyerName: string;
  } | null>(null);
  const [toastHovered, setToastHovered] = useState(false);

  // Soft Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);

  // Submission & Live Matches display
  const [isSubmitting, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [rerunningMatches, setRerunningMatches] = useState(false);

  // Buyer selection handler
  function handleSelectBuyer(b: BuyerOption) {
    setSelectedBuyer(b);
    setBuyerSearchQuery(b.company_name);
    setTargetMarket(b.country || "Israel");
  }

  // Toggle dietary / certification booster
  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // Quick Buyer Registration
  async function handleQuickAddBuyer(e: React.FormEvent) {
    e.preventDefault();
    setQuickBuyerError(null);
    setQuickBuyerPending(true);

    try {
      const res = await createQuickBuyer(quickForm);
      if (!res.ok) {
        setQuickBuyerError(res.error);
        return;
      }

      const newB: BuyerOption = {
        id: res.buyer.id,
        company_name: res.buyer.company_name,
        contact_name: res.buyer.contact_name,
        contact_email: res.buyer.contact_email,
        country: res.buyer.country,
        buyer_type: res.buyer.buyer_type,
        website: res.buyer.website,
      };

      setBuyersList((prev) => [newB, ...prev]);
      handleSelectBuyer(newB);
      setShowQuickAddBuyer(false);
      setQuickForm({
        company_name: "",
        contact_name: "",
        contact_email: "",
        contact_whatsapp: "",
        country: "Israel",
        buyer_type: "importer",
        website: "",
      });
    } catch (err: any) {
      setQuickBuyerError(err?.message || "Failed to create buyer");
    } finally {
      setQuickBuyerPending(false);
    }
  }

  // Safe JSON helper
  async function safeJsonParse<T = any>(res: Response): Promise<{ ok: boolean; data?: T; error?: string }> {
    try {
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          ok: false,
          error: res.ok
            ? "Invalid server response format"
            : `Server returned error (${res.status}): ${text.slice(0, 100).replace(/<[^>]+>/g, "").trim() || res.statusText}`,
        };
      }
      return { ok: res.ok, data: parsed, error: parsed?.error || parsed?.message };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Request failed" };
    }
  }

  // File Uploads
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    setErrorMsg(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch("/api/sourcing/upload-image", { method: "POST", body: fd });
        const parsed = await safeJsonParse<{ url?: string; filename?: string }>(uploadRes);
        if (parsed.ok && parsed.data?.url) {
          newUrls.push(parsed.data.url);
        } else if (parsed.error) {
          setErrorMsg(parsed.error);
        }
      }
      if (newUrls.length > 0) {
        setImageUrls((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Upload error");
    } finally {
      setUploadingImage(false);
    }
  }

  // Pasting Image URL directly
  function handleAddImageUrl() {
    const trimmed = pasteUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setErrorMsg("Please enter a valid HTTP or HTTPS image URL.");
      return;
    }
    setImageUrls((prev) => [...prev, trimmed]);
    setPasteUrlInput("");
    setShowUrlInput(false);
    setErrorMsg(null);
  }

  // Remove uploaded image from list
  function handleRemoveImage(idxToRemove: number) {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  }

  // Layered AI Vision Analysis (Deep Multi-Product Extraction + Catalog Check)
  async function handleAnalyzeImages() {
    if (imageUrls.length === 0) {
      setErrorMsg("Please upload files or paste at least one image URL first.");
      return;
    }
    setAnalysingVision(true);
    setErrorMsg(null);

    try {
      const res = await runLayeredAnalysisAction({
        imageUrls,
        briefText: naturalBrief,
        requestId: createdRequestId || undefined,
      });

      if (!res.ok) {
        throw new Error(res.error || "Analysis failed");
      }

      const result = res.data;
      setLayeredAnalysis(result);

      // 1. Merge shared dietary claims & certifications into selected tags
      const combinedClaims = [
        ...(result.shared_dna?.dietary || []),
        ...(result.shared_dna?.certifications || []),
      ];
      if (combinedClaims.length > 0) {
        setSelectedTags((prev) => {
          const nextSet = new Set(prev);
          combinedClaims.forEach((c) => nextSet.add(c));
          return Array.from(nextSet);
        });
      }

      // 2. Autofill Title, Brand, Category, Temperature if blank
      if (!projectTitle.trim() && result.products[0]?.product_name) {
        setProjectTitle(result.products[0].product_name);
      }
      if (!benchmarkBrands.trim() && result.products[0]?.brand_name) {
        setBenchmarkBrands(result.products[0].brand_name);
      }
      if (!category && result.category_groups[0]?.category_name) {
        setCategory(result.category_groups[0].category_name);
      }
      if (result.shared_dna?.temperature_regime) {
        const regime = result.shared_dna.temperature_regime.toLowerCase();
        if (regime.includes("frozen")) setTemperatureRegime("frozen");
        else if (regime.includes("chilled")) setTemperatureRegime("chilled");
        else setTemperatureRegime("ambient");
      }

      // 3. Keep Step 4 ready to be generated manually by user button
      // Automatically expand Step 3 so user can review & edit cards before generating brief
      setOpenSections((prev) => ({ ...prev, 3: true }));
      setVisionSummary(
        `✓ Analyzed ${result.products?.length || 0} product SKU(s) across ${imageUrls.length} images. Shared DNA: ${result.shared_dna?.dietary?.join(", ") || "General specialty"}`
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Vision extraction error");
    } finally {
      setAnalysingVision(false);
    }
  }

  // Update a single product card field inline
  function updateProductCard(cardId: string, patch: Partial<LayeredProductCard>) {
    if (!layeredAnalysis) return;
    const nextAnalysis: LayeredAnalysisResult = {
      ...layeredAnalysis,
      products: layeredAnalysis.products.map((p) =>
        p.id === cardId ? { ...p, ...patch } : p
      ),
    };
    setLayeredAnalysis(nextAnalysis);
    try {
      const raw = localStorage.getItem("fdx_deal_desk_draft");
      if (raw) {
        const d = JSON.parse(raw);
        d.layeredAnalysis = nextAnalysis;
        localStorage.setItem("fdx_deal_desk_draft", JSON.stringify(d));
      }
    } catch {}
  }

  // Update Temperature Regime in Layer 3 (syncs card, shared_dna, request state & localStorage immediately)
  function handleChangeTemperatureRegime(
    regime: "ambient" | "chilled" | "frozen",
    cardId?: string
  ) {
    setTemperatureRegime(regime);
    let nextAnalysis = layeredAnalysis;
    if (layeredAnalysis) {
      nextAnalysis = {
        ...layeredAnalysis,
        shared_dna: {
          ...layeredAnalysis.shared_dna,
          temperature_regime: regime,
        },
        products: layeredAnalysis.products.map((p) =>
          !cardId || p.id === cardId ? { ...p, temperature_regime: regime } : p
        ),
      };
      setLayeredAnalysis(nextAnalysis);
    }
    try {
      const raw = localStorage.getItem("fdx_deal_desk_draft");
      const d = raw ? JSON.parse(raw) : {};
      d.temperatureRegime = regime;
      if (nextAnalysis) d.layeredAnalysis = nextAnalysis;
      localStorage.setItem("fdx_deal_desk_draft", JSON.stringify(d));
    } catch {}
  }

  // Generate / Synthesize Layer 4 Sourcing Brief from current Layer 1, 2, 3 state
  function generateSourcingBrief() {
    const lines: string[] = [];

    // Header
    const title = projectTitle.trim() || "B2B Sourcing Specification & Outreach Brief";
    lines.push(`## ${title}`);
    lines.push(`Target Market: ${targetMarket || "Israel / International"}`);
    if (selectedBuyer?.company_name) {
      lines.push(`Buyer Account: ${selectedBuyer.company_name} (${selectedBuyer.buyer_type || "Importer / Distributor"})`);
    }
    lines.push("");

    // Layer 2 Parameters
    lines.push("### 1. Commercial Scope & Logistics Requirements");
    lines.push(`- Category: ${category || "General Specialty Food"}`);
    if (benchmarkBrands.trim()) {
      lines.push(`- Benchmark Reference Brand(s): ${benchmarkBrands.trim()}`);
    }
    const brandingLabel =
      brandingModel === "private_label"
        ? "Private Label (Buyer Brand OEM)"
        : brandingModel === "supplier_brand"
        ? "Supplier / Factory Brand"
        : "Open to both Factory & Private Label";
    lines.push(`- Branding Model: ${brandingLabel}`);
    lines.push(`- Temperature Regime: ${temperatureRegime.toUpperCase()}`);
    if (packagingFormat) lines.push(`- Target Pack Format: ${packagingFormat}`);
    if (estimatedVolume) lines.push(`- Estimated Volume / Order Cadence: ${estimatedVolume}`);
    if (selectedTags.length > 0) {
      lines.push(`- Required Claims & Quality Certifications: ${selectedTags.join(", ")}`);
    }
    lines.push("");

    // Layer 3 Product Cards
    const products = layeredAnalysis?.products || [];
    if (products.length > 0) {
      lines.push(`### 2. Target Product Lineup & Formulation Specifications (${products.length} SKU${products.length > 1 ? "s" : ""})`);
      products.forEach((p, idx) => {
        lines.push(`#### SKU #${idx + 1}: ${p.product_name || "Unnamed Reference Product"}`);
        if (p.brand_name) lines.push(`- Benchmark Brand: ${p.brand_name}`);
        if (p.sub_type) lines.push(`- Product Sub-Type: ${p.sub_type}`);
        if (p.manufacturer) lines.push(`- Legal Producer / Factory: ${p.manufacturer}`);
        const origin = [p.origin_state, p.origin_country].filter(Boolean).join(", ");
        if (origin) lines.push(`- Origin / Region: ${origin}`);
        if (p.company_website) lines.push(`- Producer Website: ${p.company_website}`);
        if (p.eu_factory_code) lines.push(`- EU Sanitary Oval Code: ${p.eu_factory_code}`);
        if (p.packaging_format) lines.push(`- Packaging Format: ${p.packaging_format}`);
        if (p.net_weight) lines.push(`- Net Weight / Unit Size: ${p.net_weight}`);
        const skuTemp = (p.temperature_regime || temperatureRegime || "ambient").toUpperCase();
        lines.push(`- Temperature Regime: ${skuTemp}`);
        if (p.dietary_claims && p.dietary_claims.length > 0) lines.push(`- Dietary Claims: ${p.dietary_claims.join(", ")}`);
        if (p.sweeteners && p.sweeteners.length > 0) lines.push(`- Sweeteners / Ingredients: ${p.sweeteners.join(", ")}`);
        if (p.catalog_match?.matched) {
          lines.push(`- Catalog Linkage: Matched to ${p.catalog_match.product_name} (${p.catalog_match.match_score}%)`);
        }
        lines.push("");
      });
    }

    // Shared DNA Summary if present
    if (layeredAnalysis?.shared_dna?.summary) {
      lines.push("### 3. Synthesis Summary & Factory Guidance");
      lines.push(layeredAnalysis.shared_dna.summary);
      lines.push("");
    }

    const synthesized = lines.join("\n").trim();
    setNaturalBrief(synthesized);
    setOpenSections((prev) => ({ ...prev, 4: true }));
  }

  // Save current project draft to Cloud + Local storage
  const handleSaveDraft = async (silent = false): Promise<string | null> => {
    setIsSavingDraft(true);
    const draftTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    try {
      const draft = {
        requestId: createdRequestId,
        buyerId: selectedBuyer?.id || null,
        buyerSearchQuery,
        projectTitle,
        benchmarkBrands,
        category,
        packagingFormat,
        estimatedVolume,
        brandingModel,
        targetMarket,
        temperatureRegime,
        targetWeightMinG,
        targetWeightMaxG,
        selectedTags,
        naturalBrief,
        imageUrls,
        layeredAnalysis,
        briefStatus,
        savedAt: draftTime,
      };
      localStorage.setItem("fdx_deal_desk_draft", JSON.stringify(draft));

      // Persist to Supabase Database
      const res = await saveDraftRequestAction({
        id: createdRequestId,
        buyer_id: selectedBuyer?.id || null,
        name: selectedBuyer?.contact_name || selectedBuyer?.company_name || "Draft Buyer",
        email: selectedBuyer?.contact_email || null,
        company: selectedBuyer?.company_name || null,
        product_name: projectTitle.trim() || "Untitled Sourcing Draft",
        category: category || null,
        benchmark_brand: benchmarkBrands || null,
        packaging_preference: packagingFormat || null,
        volume_per_year: estimatedVolume || null,
        message: naturalBrief || null,
        certifications: selectedTags,
        target_market: targetMarket || "Israel",
        private_label: brandingModel === "private_label" ? true : brandingModel === "supplier_brand" ? false : null,
        temperature_regime: temperatureRegime,
        target_weight_min_g: targetWeightMinG ? parseInt(targetWeightMinG, 10) : null,
        target_weight_max_g: targetWeightMaxG ? parseInt(targetWeightMaxG, 10) : null,
        dietary_requirements: selectedTags.filter((t) =>
          ["Sugar Free", "Gluten Free", "Keto Friendly", "Organic", "Vegan", "Non-GMO"].includes(t)
        ),
        image_urls: imageUrls,
        ai_analysis: {
          layered_analysis: layeredAnalysis,
        },
      });

      if (res.ok) {
        setCreatedRequestId(res.id);
        const resolvedStatus = (res.brief_status as any) || briefStatus || "draft";
        setBriefStatus(resolvedStatus);

        if (!silent) {
          setSaveToast({
            visible: true,
            savedAt: res.saved_at || draftTime,
            requestId: res.id,
            briefStatus: resolvedStatus,
            projectTitle: projectTitle.trim() || "Sourcing Brief Draft",
            buyerName: selectedBuyer?.company_name || "Unassigned Buyer",
          });
        }
        setSavedDraftNotice(`✓ Cloud draft saved at ${res.saved_at || draftTime}`);
        setTimeout(() => setSavedDraftNotice(null), 3500);
        return res.id;
      } else {
        if (!silent) {
          setSavedDraftNotice(`✓ Local draft saved at ${draftTime}`);
          setTimeout(() => setSavedDraftNotice(null), 3500);
        }
        return null;
      }
    } catch (err) {
      console.error("Failed to save draft:", err);
      if (!silent) {
        setSavedDraftNotice(`✓ Local draft saved at ${draftTime}`);
        setTimeout(() => setSavedDraftNotice(null), 3500);
      }
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 30s debounced autosave
  useEffect(() => {
    if (!projectTitle.trim() && !selectedBuyer) return;
    const timer = setTimeout(() => {
      handleSaveDraft(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [
    projectTitle,
    selectedBuyer,
    benchmarkBrands,
    category,
    packagingFormat,
    estimatedVolume,
    brandingModel,
    targetMarket,
    temperatureRegime,
    targetWeightMinG,
    targetWeightMaxG,
    selectedTags,
    naturalBrief,
    imageUrls,
    layeredAnalysis,
  ]);

  // Fast 1.5s cloud persistence when Temperature Regime changes on an active request/draft
  useEffect(() => {
    if (!createdRequestId && !projectTitle.trim() && !selectedBuyer) return;
    const timer = setTimeout(() => {
      handleSaveDraft(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [temperatureRegime]);

  // Global Ctrl + S / Cmd + S keyboard shortcut to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveDraft();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Auto-dismiss save toast after 6 seconds unless hovered
  useEffect(() => {
    if (!saveToast || toastHovered) return;
    const timer = setTimeout(() => {
      setSaveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [saveToast, toastHovered]);

  // Load existing request into Deal Desk for editing
  function loadRequestForEdit(req: RequestRow) {
    setCreatedRequestId(req.id);
    setProjectTitle(req.product_name || "");
    if (req.category) setCategory(req.category);
    if (req.packaging_preference) setPackagingFormat(req.packaging_preference);
    if (req.volume_per_year) setEstimatedVolume(req.volume_per_year);
    if (req.target_market) setTargetMarket(req.target_market);
    if (req.temperature_regime) {
      setTemperatureRegime(req.temperature_regime as any);
    } else if (req.ai_analysis && typeof req.ai_analysis === "object") {
      const layered = (req.ai_analysis as any)?.layered_analysis;
      const aiTemp = (
        layered?.shared_dna?.temperature_regime ||
        layered?.products?.[0]?.temperature_regime ||
        ""
      ).toLowerCase();
      if (aiTemp.includes("frozen")) setTemperatureRegime("frozen");
      else if (aiTemp.includes("chilled")) setTemperatureRegime("chilled");
      else setTemperatureRegime("ambient");
    }
    if (req.target_weight_min_g != null) setTargetWeightMinG(String(req.target_weight_min_g));
    if (req.target_weight_max_g != null) setTargetWeightMaxG(String(req.target_weight_max_g));
    if (req.private_label === true) setBrandingModel("private_label");
    else if (req.private_label === false) setBrandingModel("supplier_brand");
    else setBrandingModel("open");
    if (Array.isArray(req.certifications)) setSelectedTags(req.certifications);
    if (req.message) setNaturalBrief(req.message);
    if (Array.isArray(req.images) && req.images.length > 0) {
      setImageUrls(req.images.map((img) => img.url));
    } else {
      setImageUrls([]);
    }
    if (req.buyer_id) {
      const matched = buyersList.find((b) => b.id === req.buyer_id);
      if (matched) {
        setSelectedBuyer(matched);
        setBuyerSearchQuery(matched.company_name);
      }
    } else if (req.company) {
      setBuyerSearchQuery(req.company);
    }
    if (req.brief_status) {
      setBriefStatus(req.brief_status as any);
    }
    if (req.ai_analysis && typeof req.ai_analysis === "object") {
      const aiObj = req.ai_analysis as any;
      if (aiObj.layered_analysis) {
        setLayeredAnalysis(aiObj.layered_analysis);
      }
    }
    setActivePipelineStage(req.pipeline_stage || "stage_1_brief");
    setActiveExceptionStatus(req.exception_status || null);
    try {
      // From the Registry → push a new history entry so browser Back returns to the Registry.
      // On initial hydrate (?edit=...) → just normalise the URL in place.
      const editUrl = "/admin/requests?edit=" + req.id;
      if (window.location.search.includes("view=registry")) {
        window.history.pushState(null, "", editUrl);
      } else {
        window.history.replaceState(null, "", editUrl);
      }
    } catch {}
    window.scrollTo({ top: 0 });
    setOpenSections({ 1: true, 2: true, 3: true, 4: true, 5: true });
    setActiveTab("intake_desk");
    setSavedDraftNotice(`📂 Loaded request: ${req.company || req.name || "Buyer"} (${req.product_name || "Draft"})`);
    setTimeout(() => setSavedDraftNotice(null), 3500);

    // Auto-load existing matches for this request into the sidebar
    setLiveMatches([]);
    setRerunningMatches(false);
    getQuickMatchesAction(req.id).then((res) => {
      if (res.ok && res.matches.length > 0) {
        setLiveMatches(res.matches);
      }
    });
  }

  // Clear form to start a fresh request without losing previous progress
  async function handleStartNewRequest() {
    // 1. If current request has content, quiet-save to database so it is safely retained in Registry
    if (projectTitle.trim() || selectedBuyer) {
      try {
        await handleSaveDraft(true);
      } catch (e) {
        console.warn("Auto-save before clearing desk failed:", e);
      }
    }

    // 2. Clear localStorage draft
    try {
      localStorage.removeItem("fdx_deal_desk_draft");
    } catch {}

    // 3. Reset form state to blank pristine defaults
    setCreatedRequestId(null);
    setSelectedBuyer(null);
    setBuyerSearchQuery("");
    setProjectTitle("");
    setBenchmarkBrands("");
    setCategory("");
    setPackagingFormat("Retail Shelf Packs (Consolidated Mixed Container)");
    setEstimatedVolume("1x 40ft HQ FCL / Month (Mixed)");
    setTargetMarket("Israel");
    setTemperatureRegime("ambient");
    setTargetWeightMinG("");
    setTargetWeightMaxG("");
    setBrandingModel("open");
    setSelectedTags(["Kosher", "IFS", "Organic"]);
    setImageUrls([]);
    setNaturalBrief("");
    setLayeredAnalysis(null);
    setLiveMatches([]);
    setBriefStatus("draft");
    setActivePipelineStage("stage_1_brief");
    setActiveExceptionStatus(null);

    // 4. Reset query param in URL (push when leaving the Registry so Back still works)
    try {
      if (window.location.search.includes("view=registry")) {
        window.history.pushState(null, "", "/admin/requests");
      } else {
        window.history.replaceState(null, "", "/admin/requests");
      }
    } catch {}

    // 5. Open Step 1 and notify user
    setActiveTab("intake_desk");
    setOpenSections({ 1: true, 2: true, 3: false, 4: false, 5: false });
    setSavedDraftNotice("✨ Form cleared. Previous request safely saved in Registry!");
    setTimeout(() => setSavedDraftNotice(null), 4000);
  }

  // Hydrate when initialEditId is passed
  useEffect(() => {
    if (!initialEditId) return;
    const req = requests.find((r) => r.id === initialEditId);
    if (req) {
      loadRequestForEdit(req);
    }
  }, [initialEditId, requests]);

  // Soft Delete handler
  async function handleDeleteCurrentRequest() {
    if (!createdRequestId) {
      localStorage.removeItem("fdx_deal_desk_draft");
      setProjectTitle("");
      setNaturalBrief("");
      setImageUrls([]);
      setLayeredAnalysis(null);
      setDeleteConfirmOpen(false);
      setSavedDraftNotice("Draft discarded");
      setTimeout(() => setSavedDraftNotice(null), 3000);
      return;
    }

    setDeletingRequest(true);
    try {
      const res = await softDeleteRequestAction(createdRequestId);
      if (!res.ok) throw new Error(res.error);
      localStorage.removeItem("fdx_deal_desk_draft");
      setCreatedRequestId(null);
      setProjectTitle("");
      setNaturalBrief("");
      setImageUrls([]);
      setLayeredAnalysis(null);
      setDeleteConfirmOpen(false);
      setSavedDraftNotice("Request moved to Trash & Archive");
      router.refresh();
      setTimeout(() => setSavedDraftNotice(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete request");
    } finally {
      setDeletingRequest(false);
    }
  }

  // Restore saved draft on mount
  useEffect(() => {
    if (initialEditId) return;

    // Started from a buyer profile ("New request for this buyer") → fresh desk with buyer preselected.
    // Any previous local draft is left in place in localStorage / Registry, not restored over this one.
    if (initialBuyerId) {
      const buyer = initialBuyers.find((b) => b.id === initialBuyerId);
      if (buyer) {
        setSelectedBuyer(buyer);
        setBuyerSearchQuery(buyer.company_name);
        setSavedDraftNotice(`New request started for ${buyer.company_name}`);
        setTimeout(() => setSavedDraftNotice(null), 3500);
      }
      try {
        window.history.replaceState(null, "", "/admin/requests");
      } catch {}
      return;
    }

    try {
      const raw = localStorage.getItem("fdx_deal_desk_draft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.requestId) setCreatedRequestId(d.requestId);
        if (d.projectTitle) setProjectTitle(d.projectTitle);
        if (d.benchmarkBrands) setBenchmarkBrands(d.benchmarkBrands);
        if (d.category) setCategory(d.category);
        if (d.packagingFormat) setPackagingFormat(d.packagingFormat);
        if (d.estimatedVolume) setEstimatedVolume(d.estimatedVolume);
        if (d.brandingModel) setBrandingModel(d.brandingModel);
        if (d.targetMarket) setTargetMarket(d.targetMarket);
        if (d.temperatureRegime) {
          setTemperatureRegime(d.temperatureRegime);
        } else if (d.layeredAnalysis?.shared_dna?.temperature_regime) {
          const r = String(d.layeredAnalysis.shared_dna.temperature_regime).toLowerCase();
          if (r.includes("frozen")) setTemperatureRegime("frozen");
          else if (r.includes("chilled")) setTemperatureRegime("chilled");
        }
        if (d.targetWeightMinG != null) setTargetWeightMinG(String(d.targetWeightMinG));
        if (d.targetWeightMaxG != null) setTargetWeightMaxG(String(d.targetWeightMaxG));
        if (Array.isArray(d.selectedTags) && d.selectedTags.length > 0) setSelectedTags(d.selectedTags);
        if (d.naturalBrief) setNaturalBrief(d.naturalBrief);
        if (Array.isArray(d.imageUrls)) setImageUrls(d.imageUrls);
        if (d.layeredAnalysis) setLayeredAnalysis(d.layeredAnalysis);
        if (d.briefStatus) setBriefStatus(d.briefStatus);
        if (d.buyerId) {
          const matched = initialBuyers.find((b) => b.id === d.buyerId);
          if (matched) {
            setSelectedBuyer(matched);
            setBuyerSearchQuery(matched.company_name);
          } else if (d.buyerSearchQuery) {
            setBuyerSearchQuery(d.buyerSearchQuery);
          }
        } else if (d.buyerSearchQuery) {
          setBuyerSearchQuery(d.buyerSearchQuery);
        }
        if (d.savedAt) {
          setSavedDraftNotice(`Restored draft from ${d.savedAt}`);
          setTimeout(() => setSavedDraftNotice(null), 4000);
        }
      }
    } catch (e) {
      console.warn("Could not parse saved draft", e);
    }
  }, [initialBuyers, initialEditId, initialBuyerId]);

  // Open Preview Modal before sending confirmation email
  function handleOpenEmailPreviewModal() {
    if (!selectedBuyer) {
      setEmailNotice({
        type: "error",
        text: "Please select or quick-register a buyer first before emailing brief confirmation.",
      });
      return;
    }
    if (!selectedBuyer.contact_email) {
      setEmailNotice({
        type: "error",
        text: `Buyer "${selectedBuyer.company_name}" has no email on file. Please add an email address.`,
      });
      return;
    }
    if (!projectTitle.trim() && !naturalBrief.trim()) {
      setEmailNotice({
        type: "error",
        text: "Please enter a product title or brief notes to include in the confirmation email.",
      });
      return;
    }

    setEmailNotice(null);
    setEmailSubject(`Sourcing Brief Confirmation: ${projectTitle || "Specialty Sourcing Project"} — FoodXchange`);
    setShowEmailModal(true);
  }

  // Manually triggered Email Send to Buyer after user confirmation in modal
  async function handleSendConfirmedEmail() {
    if (!selectedBuyer || !selectedBuyer.contact_email) return;

    // Ensure draft is saved in database first to obtain a requestId
    let currentId = createdRequestId;
    if (!currentId) {
      currentId = await handleSaveDraft(true);
    }

    setSendingEmail(true);

    try {
      const res = await sendBriefConfirmationEmailAction({
        requestId: currentId || undefined,
        buyerEmail: selectedBuyer.contact_email,
        buyerName: selectedBuyer.contact_name,
        buyerCompany: selectedBuyer.company_name,
        projectTitle,
        benchmarkBrands,
        category,
        packagingFormat,
        estimatedVolume,
        brandingModel,
        targetMarket,
        selectedTags,
        naturalBrief,
        imageUrls,
        customSubject: emailSubject,
        customNotes: emailCustomNotes,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to dispatch confirmation email");
      }

      setBriefStatus("sent");
      setShowEmailModal(false);
      setEmailCustomNotes("");
      setEmailNotice({
        type: "success",
        text: `Confirmation email with digital approval link dispatched to ${selectedBuyer.contact_email}${res.simulated ? " (simulated)" : ""}!`,
      });
    } catch (err: any) {
      setEmailNotice({
        type: "error",
        text: err?.message || "Failed to send confirmation email",
      });
    } finally {
      setSendingEmail(false);
    }
  }

  // Admin Manual Override Confirmation
  async function handleAdminOverrideConfirm() {
    let currentId = createdRequestId;
    if (!currentId) {
      currentId = await handleSaveDraft(true);
    }
    if (!currentId) {
      setErrorMsg("Please save the sourcing request draft before confirming.");
      return;
    }

    setIsOverridingConfirm(true);
    try {
      const res = await adminOverrideConfirmBriefAction({
        requestId: currentId,
        notes: overrideNotes || "Admin manual confirmation override via Deal Desk",
      });

      if (res.ok) {
        setBriefStatus("confirmed");
        setShowOverrideModal(false);
        setSaveToast({
          visible: true,
          savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          requestId: currentId,
          briefStatus: "confirmed",
          projectTitle: projectTitle || "Sourcing Brief",
          buyerName: selectedBuyer?.company_name || "Buyer",
        });
      } else {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to override brief confirmation");
    } finally {
      setIsOverridingConfirm(false);
    }
  }

  // Generate & Copy Buyer Review Link
  async function handleCopyBuyerLink() {
    let currentId = createdRequestId;
    if (!currentId) {
      currentId = await handleSaveDraft(true);
    }
    if (!currentId) {
      setErrorMsg("Please save draft before generating public link.");
      return;
    }

    setGeneratingLink(true);
    try {
      const res = await createBriefTokenAction(currentId);
      if (res.ok) {
        await navigator.clipboard.writeText(res.url);
        setCopiedLinkNotice(true);
        setTimeout(() => setCopiedLinkNotice(false), 3000);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not generate link");
    } finally {
      setGeneratingLink(false);
    }
  }

  // Submit Project & Run Real-Time Reverse Match (LOCKED UNTIL CONFIRMED)
  async function handleSubmitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBuyer) {
      setErrorMsg("Please select or quick-register a buyer first.");
      return;
    }
    if (!projectTitle.trim()) {
      setErrorMsg("Please enter a product title or general project description.");
      return;
    }

    // Matching Lock Gate check
    if (briefStatus !== "confirmed") {
      setErrorMsg("🔒 Reverse-matching is locked until the brief is confirmed by the buyer or approved via Admin Override.");
      return;
    }

    setErrorMsg(null);
    setLiveMatches([]);
    setFetchingMatches(true);

    startTransition(async () => {
      try {
        const res = await createRequestForBuyer({
          requestId: createdRequestId || undefined,
          buyer_id: selectedBuyer.id,
          name: selectedBuyer.contact_name || selectedBuyer.company_name,
          email: selectedBuyer.contact_email,
          company: selectedBuyer.company_name,
          product_name: projectTitle.trim(),
          category: category || "General Food",
          benchmark_brand: benchmarkBrands || undefined,
          packaging_preference: packagingFormat,
          volume_per_year: estimatedVolume,
          message: naturalBrief || null,
          certifications: selectedTags,
          target_market: targetMarket,
          private_label:
            brandingModel === "private_label"
              ? true
              : brandingModel === "supplier_brand"
              ? false
              : null,
          temperature_regime: temperatureRegime,
          target_weight_min_g: targetWeightMinG ? parseInt(targetWeightMinG, 10) : null,
          target_weight_max_g: targetWeightMaxG ? parseInt(targetWeightMaxG, 10) : null,
          dietary_requirements: selectedTags.filter((t) =>
            ["Sugar Free", "Gluten Free", "Keto Friendly", "Organic", "Vegan", "Non-GMO"].includes(t)
          ),
          image_urls: imageUrls,
          ai_analysis: {
            layered_analysis: layeredAnalysis,
            benchmark_brand: benchmarkBrands || undefined,
            packaging_format: packagingFormat,
          },
        });

        if (!res.ok) {
          setErrorMsg(res.error);
          setFetchingMatches(false);
          return;
        }

        const newReqId = (res as any).id || (res as any).requestId;
        setCreatedRequestId(newReqId);

        // Fetch reverse-matches
        const matchRes = await getQuickMatchesAction(newReqId);
        if (matchRes.ok) {
          setLiveMatches(matchRes.matches || []);
        } else {
          setErrorMsg(matchRes.error || "Match ranking failed");
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "An unexpected error occurred during matchmaking");
      } finally {
        setFetchingMatches(false);
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* ── TOP OPERATIONAL APP BAR ── */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-black text-base shadow-sm">
              FDX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Sourcing Deal Desk
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 uppercase tracking-wider">
                  B2B Funnel
                </span>
                {/* Brief status capsule in header */}
                {briefStatus === "confirmed" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span>✓</span> Confirmed by Buyer
                  </span>
                ) : briefStatus === "sent" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <span>⏳</span> Waiting for Buyer
                  </span>
                ) : briefStatus === "changes_requested" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                    <span>✏️</span> Changes Requested
                  </span>
                ) : briefStatus === "reconfirm_needed" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <span>⚠️</span> Re-confirm Needed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                    <span>📝</span> Draft Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Single-page 5-step intake, layered visual AI, buyer confirmation, and locked reverse-match
              </p>
            </div>
          </div>

          {/* Quick Actions & View Switcher */}
          <div className="flex items-center gap-2">
            {createdRequestId && (
              <Link
                href={`/admin/requests/${createdRequestId}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition flex items-center gap-1.5"
                title="See full Request Page & Outreach Hub"
              >
                <span>📄</span>
                <span className="hidden md:inline">See Request Page</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleStartNewRequest}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Clear form and create a brand new sourcing request"
            >
              <span>➕</span>
              <span>New Request</span>
            </button>

            <Link
              href="/admin/settings/usage"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1"
              title="View live token usage and API costs"
            >
              <span>📊</span>
              <span className="hidden sm:inline">API Costs</span>
            </Link>

            <Link
              href="/admin/settings/trash"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1"
              title="Open archived requests and deleted media"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Trash</span>
            </Link>

            {/* View Mode Pill Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => switchTab("intake_desk")}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === "intake_desk"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Intake Desk
              </button>
              <button
                type="button"
                onClick={() => switchTab("registry_table")}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === "registry_table"
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Requests Registry ({requests.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── NOTIFICATION BANNERS ── */}
      {savedDraftNotice && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center animate-in fade-in duration-200 flex items-center justify-center gap-2">
          <span>💾</span>
          <span>{savedDraftNotice}</span>
        </div>
      )}

      {emailNotice && (
        <div
          className={`text-xs font-bold py-2 px-4 text-center border-b flex items-center justify-center gap-2 ${
            emailNotice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span>{emailNotice.type === "success" ? "✓" : "⚠️"}</span>
          <span>{emailNotice.text}</span>
          <button
            type="button"
            onClick={() => setEmailNotice(null)}
            className="ml-2 text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === "intake_desk" ? (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT PANEL: 5-STEP COLLAPSIBLE FUNNEL (col 7) ── */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active Request Context Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedBuyer?.company_name ? selectedBuyer.company_name.charAt(0).toUpperCase() : "📝"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Active Request:
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {selectedBuyer?.company_name || "Unassigned Buyer (New Lead)"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        createdRequestId
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {createdRequestId ? "✓ Saved in Registry" : "● Draft Mode"}
                    </span>
                    {createdRequestId && (
                      <PipelineStageSelector
                        requestId={createdRequestId}
                        currentStage={activePipelineStage}
                        currentException={activeExceptionStatus}
                        size="sm"
                        onStageChange={(newStg, newEx) => {
                          setActivePipelineStage(newStg);
                          setActiveExceptionStatus(newEx);
                        }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                    {projectTitle ? projectTitle : "No product scope entered yet — start typing below"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => switchTab("registry_table")}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="View all requests and their statuses in the registry"
                >
                  <span>📋</span>
                  <span>Registry ({requests.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartNewRequest}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Save current progress and clear the desk for a new request"
                >
                  <span>➕</span>
                  <span>Clear & New Request</span>
                </button>
              </div>
            </div>

            {/* Stepper Navigation Strip */}
            <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => toggleSection(1)}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    openSections[1] ? "bg-orange-500 text-white font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>1. Buyer</span>
                  {selectedBuyer && <span className="text-[10px] text-emerald-300 font-bold">✓</span>}
                </button>
                <span className="text-slate-600">→</span>
                <button
                  type="button"
                  onClick={() => toggleSection(2)}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    openSections[2] ? "bg-orange-500 text-white font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>2. Visuals</span>
                  {imageUrls.length > 0 && (
                    <span className="text-[10px] bg-slate-700 px-1.5 py-0.2 rounded-full font-mono">{imageUrls.length}</span>
                  )}
                </button>
                <span className="text-slate-600">→</span>
                <button
                  type="button"
                  onClick={() => toggleSection(3)}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    openSections[3] ? "bg-orange-500 text-white font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>3. AI DNA</span>
                  {layeredAnalysis && (
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {layeredAnalysis.products?.length || 0}
                    </span>
                  )}
                </button>
                <span className="text-slate-600">→</span>
                <button
                  type="button"
                  onClick={() => toggleSection(4)}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    openSections[4] ? "bg-orange-500 text-white font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>4. Brief</span>
                  {naturalBrief && <span className="text-[10px] text-emerald-300 font-bold">✓</span>}
                </button>
                <span className="text-slate-600">→</span>
                <button
                  type="button"
                  onClick={() => toggleSection(5)}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    openSections[5] ? "bg-orange-500 text-white font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>5. Confirm</span>
                  {briefStatus === "confirmed" ? (
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">✓ Confirmed</span>
                  ) : (
                    <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">Gate</span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const allOpen = Object.values(openSections).every(Boolean);
                    if (allOpen) collapseAll();
                    else expandAll();
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  {Object.values(openSections).every(Boolean) ? "Collapse All" : "Expand All"}
                </button>
              </div>
            </div>

            {/* ── STEP 1 CARD: BUYER INTAKE ── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition">
              <div
                onClick={() => toggleSection(1)}
                className="p-4 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Buyer Intake & Lead Account
                  </h3>
                  {selectedBuyer && (
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ {selectedBuyer.company_name} ({selectedBuyer.country || "Israel"})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs">{openSections[1] ? "▲" : "▼"}</span>
                </div>
              </div>

              {openSections[1] && (
                <div className="p-5 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Search Registered Importers & Retail Buyers
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddBuyer(!showQuickAddBuyer)}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      {showQuickAddBuyer ? "✕ Close" : "+ Quick Register Buyer"}
                    </button>
                  </div>

                  {/* Quick Add Buyer Drawer */}
                  {showQuickAddBuyer && (
                    <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-orange-950 uppercase">⚡ Register New Lead</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <input
                          placeholder="Company Name * (e.g. Intergood)"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500"
                          value={quickForm.company_name}
                          onChange={(e) => setQuickForm((q) => ({ ...q, company_name: e.target.value }))}
                          required
                        />
                        <input
                          placeholder="Contact Email * (e.g. sharon@intergood.co)"
                          type="email"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500"
                          value={quickForm.contact_email}
                          onChange={(e) => setQuickForm((q) => ({ ...q, contact_email: e.target.value }))}
                          required
                        />
                        <input
                          placeholder="Contact Person (e.g. Sharon Avidor)"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500"
                          value={quickForm.contact_name}
                          onChange={(e) => setQuickForm((q) => ({ ...q, contact_name: e.target.value }))}
                        />
                        <input
                          placeholder="Company Website (e.g. https://intergood.co)"
                          type="url"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500"
                          value={quickForm.website ?? ""}
                          onChange={(e) => setQuickForm((q) => ({ ...q, website: e.target.value }))}
                        />
                      </div>
                      {quickBuyerError && <p className="text-xs text-red-600">{quickBuyerError}</p>}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={quickBuyerPending}
                          onClick={handleQuickAddBuyer}
                          className="text-xs font-bold px-4 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 cursor-pointer"
                        >
                          {quickBuyerPending ? "Saving..." : "Save & Use Lead"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Combobox Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Type buyer name, contact, or domain (e.g. Intergood, Rami Levy)..."
                      value={buyerSearchQuery}
                      onChange={(e) => {
                        setBuyerSearchQuery(e.target.value);
                        if (selectedBuyer && e.target.value !== selectedBuyer.company_name) {
                          setSelectedBuyer(null);
                        }
                      }}
                      className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />

                    {/* Suggestions List */}
                    {buyerSearchQuery && !selectedBuyer && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100">
                        {filteredBuyers.length > 0 ? (
                          filteredBuyers.map((b) => (
                            <div
                              key={b.id}
                              onClick={() => handleSelectBuyer(b)}
                              className="px-3.5 py-2 hover:bg-orange-50 cursor-pointer flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{b.company_name}</span>
                                {b.contact_name && <span className="text-slate-500 ml-1.5">({b.contact_name})</span>}
                              </div>
                              <span className="text-[11px] text-slate-400">{b.country || "Israel"}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-400 flex items-center justify-between">
                            <span>No buyer found matching "{buyerSearchQuery}"</span>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickForm((q) => ({ ...q, company_name: buyerSearchQuery }));
                                setShowQuickAddBuyer(true);
                              }}
                              className="text-orange-600 font-bold hover:underline"
                            >
                              + Add "{buyerSearchQuery}"
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Buyer Capsule Badge */}
                  {selectedBuyer && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs">
                          {selectedBuyer.company_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{selectedBuyer.company_name}</span>
                            <span className="text-slate-500">({selectedBuyer.contact_email || "no email"})</span>
                          </div>
                          {selectedBuyer.contact_name && (
                            <span className="text-[11px] text-slate-500">Contact: {selectedBuyer.contact_name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBuyer(null);
                          setBuyerSearchQuery("");
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── STEP 2 CARD: REQUEST SCOPE & PACKAGING IMAGES ── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition">
              <div
                onClick={() => toggleSection(2)}
                className="p-4 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Request Scope & Reference Visuals
                  </h3>
                  {projectTitle && (
                    <span className="text-xs text-slate-600 truncate max-w-xs font-medium">
                      ({projectTitle})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs">{openSections[2] ? "▲" : "▼"}</span>
                </div>
              </div>

              {openSections[2] && (
                <div className="p-5 space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Project Title / Target Products *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Branded Keto, Sugar-Free & Gluten-Free Snack Assortment (or Chopped Tomatoes 400g)"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Benchmark Brands (Quality Profile)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ChocZero, Dr. Schär, Gullon Zero, Nutrifree"
                        value={benchmarkBrands}
                        onChange={(e) => setBenchmarkBrands(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Branding Model</label>
                      <select
                        value={brandingModel}
                        onChange={(e: any) => setBrandingModel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                      >
                        <option value="supplier_brand">Supplier branded Line</option>
                        <option value="private_label">Private Label (Buyer's Own Label OEM)</option>
                        <option value="open">Open to Both</option>
                      </select>
                    </div>
                  </div>

                  {/* Dietary & Certifications Quick Tags */}
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <label className="text-[11px] font-bold text-slate-700">
                        Dietary Attributes & Audit Certifications
                      </label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        ⚡ Beneficial Ranking Boosters
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {COMMON_DIETARY_TAGS.map((tag) => {
                        const active = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                              active
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Packaging, Volume, Target Market */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Packaging Format</label>
                      <input
                        type="text"
                        value={packagingFormat}
                        onChange={(e) => setPackagingFormat(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Volume</label>
                      <input
                        type="text"
                        value={estimatedVolume}
                        onChange={(e) => setEstimatedVolume(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Market</label>
                      <input
                        type="text"
                        value={targetMarket}
                        onChange={(e) => setTargetMarket(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Image Staging & Deep Vision Button */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Reference Packaging Images
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Upload front & back pack shots. Grouped into single product cards during analysis.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
                        >
                          {uploadingImage ? "Uploading..." : "📁 Upload Files"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
                        >
                          🔗 Add URL
                        </button>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />

                    {showUrlInput && (
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="Paste image link (e.g. https://domain.com/choczero-pack.jpg)..."
                          value={pasteUrlInput}
                          onChange={(e) => setPasteUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddImageUrl();
                            }
                          }}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddImageUrl}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 cursor-pointer text-xs"
                        >
                          Add URL
                        </button>
                      </div>
                    )}

                    {imageUrls.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">
                            {imageUrls.length} image(s) staged
                          </span>
                          <button
                            type="button"
                            onClick={handleAnalyzeImages}
                            disabled={analysingVision}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-95 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 transition"
                          >
                            <span>✨</span>
                            <span>{analysingVision ? "Analyzing Images with AI..." : "Run AI Vision & Layered Fingerprint"}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {imageUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-video flex items-center justify-center shadow-2xs"
                            >
                              <img
                                src={url}
                                alt={`Product visual ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white text-[11px] flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
                                title="Delete image"
                              >
                                ✕
                              </button>
                              <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                                #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Upload packaging images above, then click "Run AI Vision" to analyze products, extract back-of-pack producers, identify EU health mark codes, and cross-match with European factories.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── STEP 3 CARD: LAYERED AI ANALYSIS & CATALOG MATCHES ── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition">
              <div
                onClick={() => toggleSection(3)}
                className="p-4 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Layered AI Analysis & Catalog Matches
                  </h3>
                  {layeredAnalysis && (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ {layeredAnalysis.products?.length || 0} Products Identified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs">{openSections[3] ? "▲" : "▼"}</span>
                </div>
              </div>

              {openSections[3] && (
                <div className="p-5 space-y-4 animate-in fade-in duration-150">
                  {analysingVision ? (
                    <div className="py-8 text-center text-xs text-slate-600 space-y-2">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="font-semibold text-slate-800">Pass A: Inspecting back-of-pack labels & EU sanitary oval codes...</p>
                      <p className="text-slate-400 text-[11px]">Pass B: Synthesizing Shared DNA & cross-matching with FoodXchange catalog...</p>
                    </div>
                  ) : layeredAnalysis ? (
                    <div className="space-y-4">
                      {/* Layer 1: Shared Request DNA */}
                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                            Layer 1: Shared Request DNA
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                            Common Denominator Criteria
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(layeredAnalysis.shared_dna?.dietary || []).map((d) => (
                            <span key={d} className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-900 rounded-md text-xs font-bold shadow-2xs">
                              🌱 {d}
                            </span>
                          ))}
                          {(layeredAnalysis.shared_dna?.certifications || []).map((c) => (
                            <span key={c} className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-900 rounded-md text-xs font-bold shadow-2xs">
                              ⭐ {c}
                            </span>
                          ))}
                        </div>
                        {layeredAnalysis.shared_dna?.summary && (
                          <p className="text-xs text-emerald-900 leading-relaxed pt-1">
                            {layeredAnalysis.shared_dna.summary}
                          </p>
                        )}
                      </div>

                      {/* Layer 2: Category Groups */}
                      {layeredAnalysis.category_groups?.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-slate-500 uppercase text-[10px]">
                            Layer 2 Category Groups:
                          </span>
                          {layeredAnalysis.category_groups.map((cg) => (
                            <span key={cg.category_name} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-bold border border-slate-200">
                              📂 {cg.category_name} ({cg.product_count} SKU{cg.product_count > 1 ? "s" : ""})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Layer 3: Multi-Product Cards */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                              Layer 3: Multi-Product Reference Cards (Editable)
                            </h4>
                            <span className="text-[11px] text-slate-500">
                              Front & back panels merged · Temperature Regime & physical specs
                            </span>
                          </div>
                          {/* Layer 3 Global Temperature Regime Selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Temperature Regime:
                            </span>
                            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                              {(["ambient", "chilled", "frozen"] as const).map((regime) => (
                                <button
                                  key={regime}
                                  type="button"
                                  onClick={() => handleChangeTemperatureRegime(regime)}
                                  className={`px-2.5 py-1 text-center font-bold capitalize rounded-md transition cursor-pointer ${
                                    temperatureRegime === regime
                                      ? "bg-orange-500 text-white shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  {regime}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5">
                          {layeredAnalysis.products.map((prod, idx) => (
                            <div
                              key={prod.id || idx}
                              className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-3"
                            >
                              {/* Top row: Thumbnails and Title/Brand */}
                              <div className="flex items-start gap-3">
                                {prod.image_urls?.length > 0 && (
                                  <div className="flex gap-1.5 shrink-0">
                                    {prod.image_urls.map((u, i) => (
                                      <div
                                        key={i}
                                        className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white"
                                      >
                                        <img src={u} alt="pack" className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                      Product Name
                                    </label>
                                    <input
                                      type="text"
                                      value={prod.product_name}
                                      onChange={(e) => updateProductCard(prod.id, { product_name: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                      Benchmark Brand
                                    </label>
                                    <input
                                      type="text"
                                      value={prod.brand_name || ""}
                                      onChange={(e) => updateProductCard(prod.id, { brand_name: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                      placeholder="Brand..."
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Producer, Origin, EU Health Mark, Company Website */}
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                    Legal Producer (Back-of-Pack)
                                  </label>
                                  <input
                                    type="text"
                                    value={prod.manufacturer || ""}
                                    onChange={(e) => updateProductCard(prod.id, { manufacturer: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                    placeholder="e.g. Chocolaterie Limar NV"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                    Origin Country / State
                                  </label>
                                  <input
                                    type="text"
                                    value={[prod.origin_state, prod.origin_country].filter(Boolean).join(", ")}
                                    onChange={(e) => updateProductCard(prod.id, { origin_country: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                    placeholder="e.g. Belgium"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                    EU Sanitary Oval Code
                                  </label>
                                  <input
                                    type="text"
                                    value={prod.eu_factory_code || ""}
                                    onChange={(e) => updateProductCard(prod.id, { eu_factory_code: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-slate-800"
                                    placeholder="e.g. BE 1234 EG"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                                      Company / Brand Website
                                    </label>
                                    {prod.company_website && (
                                      <a
                                        href={prod.company_website.startsWith("http") ? prod.company_website : `https://${prod.company_website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] text-orange-600 hover:underline"
                                      >
                                        Visit ↗
                                      </a>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={prod.company_website || ""}
                                    onChange={(e) => updateProductCard(prod.id, { company_website: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                    placeholder="e.g. www.limar.be"
                                  />
                                </div>
                              </div>

                              {/* Physical Specs, Temperature Regime & Format */}
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-1">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                    Product Sub-Type
                                  </label>
                                  <input
                                    type="text"
                                    value={prod.sub_type || ""}
                                    onChange={(e) => updateProductCard(prod.id, { sub_type: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                    placeholder="e.g. Chocolate Bark, Wafer Bar"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                    Net Weight / Unit Size
                                  </label>
                                  <input
                                    type="text"
                                    value={prod.net_weight || ""}
                                    onChange={(e) => updateProductCard(prod.id, { net_weight: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                    placeholder="e.g. 170g, 6 oz"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                    Temperature Regime
                                  </label>
                                  <div className="flex rounded border border-slate-200 bg-white p-0.5">
                                    {(["ambient", "chilled", "frozen"] as const).map((regime) => {
                                      const activeRegime = (prod.temperature_regime || temperatureRegime || "ambient").toLowerCase();
                                      const isSelected = activeRegime === regime;
                                      return (
                                        <button
                                          key={regime}
                                          type="button"
                                          onClick={() => handleChangeTemperatureRegime(regime, prod.id)}
                                          className={`flex-1 py-0.5 text-[10px] text-center font-bold capitalize rounded transition cursor-pointer ${
                                            isSelected
                                              ? "bg-orange-500 text-white shadow-2xs"
                                              : "text-slate-600 hover:text-slate-900"
                                          }`}
                                        >
                                          {regime}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                                      Packaging Format
                                    </label>
                                    <span className="text-[9px] text-slate-400">Quick Pills ↓</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={prod.packaging_format || ""}
                                    onChange={(e) => updateProductCard(prod.id, { packaging_format: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                    placeholder="e.g. Stand-up Pouch, Pillow Bag"
                                  />
                                  {/* Quick Select Format Pills */}
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {PACKAGING_FORMAT_PRESETS.slice(0, 5).map((fmt) => (
                                      <button
                                        key={fmt}
                                        type="button"
                                        onClick={() => updateProductCard(prod.id, { packaging_format: fmt })}
                                        className={`text-[9px] px-1.5 py-0.5 rounded transition ${
                                          prod.packaging_format?.toLowerCase() === fmt.toLowerCase()
                                            ? "bg-orange-600 text-white font-bold"
                                            : "bg-slate-200/70 hover:bg-slate-300 text-slate-700"
                                        }`}
                                      >
                                        {fmt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Sweeteners & Catalog Match Badge */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {prod.sweeteners?.length ? (
                                    <>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sweeteners:</span>
                                      {prod.sweeteners.map((sw) => (
                                        <span key={sw} className="px-1.5 py-0.5 bg-orange-100 text-orange-900 rounded text-[10px] font-semibold">
                                          {sw}
                                        </span>
                                      ))}
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No sweeteners visible</span>
                                  )}
                                </div>

                                {/* Catalog Match Status */}
                                {prod.catalog_match?.matched ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
                                    <span>✓ In Catalog:</span>
                                    <span>{prod.catalog_match.product_name || "Matched"}</span>
                                    <span className="text-[10px] text-emerald-700">({prod.catalog_match.match_score}%)</span>
                                  </span>
                                ) : (
                                  (() => {
                                    const badge = getProducerRegionBadge(prod.origin_country || prod.origin_state);
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                                        {badge.label}
                                      </span>
                                    );
                                  })()
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            Layer 3: Product Specifications & Temperature Regime
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Select cold-chain / storage temperature regime for this request
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Temperature Regime:
                          </span>
                          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                            {(["ambient", "chilled", "frozen"] as const).map((regime) => (
                              <button
                                key={regime}
                                type="button"
                                onClick={() => handleChangeTemperatureRegime(regime)}
                                className={`px-2.5 py-1 text-center font-bold capitalize rounded-md transition cursor-pointer ${
                                  temperatureRegime === regime
                                    ? "bg-orange-500 text-white shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {regime}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 space-y-1">
                        <p>No multi-product vision cards extracted yet.</p>
                        <p className="text-[11px] text-slate-400">
                          Upload packaging images in Step 2 and click "Run AI Vision & Layered Fingerprint" to automatically synthesize specifications and check existing catalog products.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── STEP 4 CARD: SOURCING BRIEF DRAFT ── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition">
              <div
                onClick={() => toggleSection(4)}
                className="p-4 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sourcing Brief Draft (Version {briefVersion}.0)
                  </h3>
                  {naturalBrief && (
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Ready for Review
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs">{openSections[4] ? "▲" : "▼"}</span>
                </div>
              </div>

              {openSections[4] && (
                <div className="p-5 space-y-3 animate-in fade-in duration-150">
                  {/* Action Banner to Generate / Refresh Brief from Layers 1, 2, 3 */}
                  <div className="p-3.5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border border-orange-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>Compile Sourcing Brief from Steps 1, 2 & 3</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Click the button to automatically compile all buyer scope, brand benchmarks, commercial volumes, and edited product cards (including websites & origin countries) into this brief.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={generateSourcingBrief}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                    >
                      <span>🔄</span>
                      <span>{naturalBrief ? "Recompile Brief from Steps 1-3" : "Generate Brief from Steps 1-3"}</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Operational Brief & Factory Outreach Specifications
                    </label>

                    {/* Quick helper to inject/sync product names & descriptions from Layer 3 cards */}
                    {layeredAnalysis?.products && layeredAnalysis.products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const productLines = layeredAnalysis.products.map((p, idx) => {
                            const parts: string[] = [];
                            if (p.sub_type) parts.push(`Type: ${p.sub_type}`);
                            if (p.packaging_format) parts.push(`Packaging: ${p.packaging_format}`);
                            if (p.net_weight) parts.push(`Weight: ${p.net_weight}`);
                            const origin = [p.origin_state, p.origin_country].filter(Boolean).join(", ");
                            if (origin) parts.push(`Origin: ${origin}`);
                            if (p.company_website) parts.push(`Web: ${p.company_website}`);
                            if (p.dietary_claims && p.dietary_claims.length > 0) parts.push(`Claims: ${p.dietary_claims.join(", ")}`);
                            if (p.sweeteners && p.sweeteners.length > 0) parts.push(`Sweeteners: ${p.sweeteners.join(", ")}`);
                            
                            const desc = parts.length > 0 ? ` (${parts.join(" | ")})` : "";
                            return `• SKU ${idx + 1}: ${p.product_name || "Unnamed Product"}${desc}`;
                          });

                          const header = "### Target Product Lineup & SKU Specifications:\n" + productLines.join("\n");
                          if (!naturalBrief.trim()) {
                            setNaturalBrief(header);
                          } else if (!naturalBrief.includes("Target Product Lineup")) {
                            setNaturalBrief(`${naturalBrief.trim()}\n\n${header}`);
                          }
                        }}
                        className="text-[10px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition self-start sm:self-auto flex items-center gap-1 cursor-pointer"
                        title="Append all recognized product names, sub-types, packaging formats, weights, and websites into the brief"
                      >
                        <span>✨</span>
                        <span>Append SKU Details ({layeredAnalysis.products.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Visual Product Reference Summary Badge in Step 4 if products exist */}
                  {layeredAnalysis?.products && layeredAnalysis.products.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Included Products:
                      </span>
                      {layeredAnalysis.products.map((p, i) => (
                        <div
                          key={p.id || i}
                          className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 shadow-2xs"
                        >
                          <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-semibold">{p.product_name || `Product #${i + 1}`}</span>
                          {(p.sub_type || p.packaging_format || p.net_weight || p.origin_country) && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({[p.sub_type, p.packaging_format, p.net_weight, p.origin_country].filter(Boolean).join(" · ")})
                            </span>
                          )}
                          {p.company_website && (
                            <span className="text-[9px] text-orange-600 font-mono">
                              🌐
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    rows={8}
                    placeholder="Click 'Generate Brief from Steps 1-3' above or enter custom operational specifications..."
                    value={naturalBrief}
                    onChange={(e) => setNaturalBrief(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 outline-none focus:border-orange-500 focus:bg-white font-mono leading-relaxed"
                  />

                  {/* Cloud Draft Save Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-400">
                      Auto-saves every 30s &middot; Shortcut: <kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600 border border-slate-200">Ctrl+S</kbd>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSaveDraft(false)}
                      disabled={isSavingDraft}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <span>💾</span>
                      <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── STEP 5 CARD: BUYER CONFIRMATION HUB & REVERSE-MATCHING GATE ── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition">
              <div
                onClick={() => toggleSection(5)}
                className="p-4 bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center">
                    5
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Buyer Confirmation Hub & Matching Gate
                  </h3>
                  {briefStatus === "confirmed" ? (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Confirmed (Unlocked)
                    </span>
                  ) : (
                    <span className="text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      🔒 Matching Locked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs">{openSections[5] ? "▲" : "▼"}</span>
                </div>
              </div>

              {openSections[5] && (
                <div className="p-5 space-y-4 animate-in fade-in duration-150">
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Current Approval Lifecycle
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {briefStatus === "confirmed" ? (
                          <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                            <span>✓</span> Brief Confirmed by Buyer &mdash; Matching Active
                          </span>
                        ) : briefStatus === "sent" ? (
                          <span className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                            <span>⏳</span> Awaiting Buyer Review (Digital Link Dispatched)
                          </span>
                        ) : briefStatus === "changes_requested" ? (
                          <span className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                            <span>✏️</span> Buyer Requested Adjustments
                          </span>
                        ) : briefStatus === "reconfirm_needed" ? (
                          <span className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                            <span>⚠️</span> Specifications Modified &mdash; Re-confirmation Required
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <span>📝</span> Draft Prepared &mdash; Not Yet Dispatched
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Manual Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCopyBuyerLink}
                        disabled={generatingLink}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                        title="Copy digital link to send via WhatsApp or chat"
                      >
                        <span>🔗</span>
                        <span>{copiedLinkNotice ? "✓ Copied!" : "Copy Buyer Link"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenEmailPreviewModal}
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>✉️</span>
                        <span>Email Buyer Brief</span>
                      </button>

                      {briefStatus !== "confirmed" && (
                        <button
                          type="button"
                          onClick={() => setShowOverrideModal(true)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                          title="Manually confirm if approved by phone or WhatsApp"
                        >
                          <span>✓</span>
                          <span>Admin Override</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Matching Lock Gate Panel */}
                  {briefStatus !== "confirmed" ? (
                    <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                        <span>🔒</span>
                        <span>Reverse-Matching Locked (Awaiting Buyer Confirmation)</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Supplier matchmaking will unlock immediately once the buyer approves this sourcing brief via their secure link, or after you apply an Admin Override. This guarantees factory outreach only runs on 100% verified specifications.
                      </p>
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span>🔒</span>
                        <span>Reverse-Matching Locked (Confirm Brief to Unlock)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs sm:text-sm">
                        <span>🔓</span>
                        <span>Sourcing Brief 100% Confirmed &mdash; Reverse-Matching Unlocked!</span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Specifications are verified. You can now execute reverse-matching across 80,000+ European catalog items and qualified factories.
                      </p>
                      <button
                        type="button"
                        onClick={handleSubmitProject}
                        disabled={isSubmitting || fetchingMatches}
                        className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-sm hover:opacity-95 shadow-md shadow-orange-500/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting || fetchingMatches ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Matching European Factories...</span>
                          </>
                        ) : (
                          <>
                            <span>🚀</span>
                            <span>Run Reverse-Match Across European Catalog Items</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {createdRequestId && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <span>🗑️</span>
                        <span>Move Request to Trash</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: LIVE MATCHES & RECENT PROJECTS (col 5) ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Live Matches Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {liveMatches.length > 0 ? `🎯 ${liveMatches.length} Factory Matches` : "Live Sourcing Feed"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {createdRequestId && (
                    <>
                      <button
                        onClick={async () => {
                          setRerunningMatches(true);
                          setLiveMatches([]);
                          try {
                            const res = await rerunMatchingAction(createdRequestId);
                            if (res.ok) {
                              setLiveMatches(res.matches || []);
                            } else {
                              setErrorMsg(res.error || "Re-matching failed");
                            }
                          } catch (e: any) {
                            setErrorMsg(e.message || "Re-matching error");
                          } finally {
                            setRerunningMatches(false);
                          }
                        }}
                        disabled={rerunningMatches || fetchingMatches}
                        title="Re-score this request against the full supplier database"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          rerunningMatches || fetchingMatches
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                        }`}
                      >
                        {rerunningMatches ? (
                          <>
                            <span className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            Re-scoring...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Re-Calculate
                          </>
                        )}
                      </button>
                      <Link
                        href={`/admin/requests/${createdRequestId}`}
                        className="text-xs font-bold text-orange-600 hover:underline"
                      >
                        Open →
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {fetchingMatches || rerunningMatches ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>{rerunningMatches ? "Re-scoring against full supplier database..." : "Ranking European factories by certifications & specs..."}</p>
                </div>
              ) : liveMatches.length > 0 ? (
                <div className="space-y-2.5">
                  {liveMatches.map((m, idx) => {
                    const bd = m.match_breakdown ?? {};
                    const score = m.match_score ?? 0;
                    const scoreColor =
                      score >= 85 ? "bg-emerald-500" :
                      score >= 70 ? "bg-amber-500" :
                      "bg-slate-400";
                    const scoreBadgeColor =
                      score >= 85 ? "bg-emerald-100 text-emerald-800" :
                      score >= 70 ? "bg-amber-100 text-amber-800" :
                      "bg-slate-100 text-slate-700";
                    const matchedCerts: string[] = Array.isArray(bd.matched_certifications)
                      ? bd.matched_certifications
                      : [];

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-slate-50 hover:bg-orange-50/40 border border-slate-200/80 transition text-xs space-y-2"
                      >
                        {/* Top row: rank + name + score badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">{m.company_name}</div>
                              <div className="text-slate-500 mt-0.5 leading-tight">{m.product_name}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] flex-shrink-0 ${scoreBadgeColor}`}>
                            {score}%
                          </span>
                        </div>

                        {/* Score bar */}
                        <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${scoreColor}`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>

                        {/* Score breakdown chips */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="text-slate-400">📍 {m.country || "Europe"}</span>
                          {typeof bd.vector === "number" && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                              Semantic {bd.vector.toFixed(0)}
                            </span>
                          )}
                          {typeof bd.category === "number" && bd.category > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold">
                              Category +{bd.category}
                            </span>
                          )}
                          {typeof bd.compliance === "number" && bd.compliance > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                              Certs +{bd.compliance}
                            </span>
                          )}
                          {typeof (bd.temperature ?? bd.coldChain) === "number" && (bd.temperature ?? bd.coldChain) !== 0 && (
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${(bd.temperature ?? bd.coldChain) > 0 ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-700"}`}>
                              {(bd.temperature ?? bd.coldChain) > 0 ? `❄️ +${bd.temperature ?? bd.coldChain}` : `⚠️ Cold ${bd.temperature ?? bd.coldChain}`}
                            </span>
                          )}
                          {typeof bd.origin === "number" && bd.origin > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">
                              🌍 Origin +{bd.origin}
                            </span>
                          )}
                          {typeof bd.exclusion === "number" && bd.exclusion < 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                              ⚠️ Excluded {bd.exclusion}
                            </span>
                          )}
                        </div>

                        {/* Matched certs */}
                        {matchedCerts.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {matchedCerts.slice(0, 4).map((mc: string) => (
                              <span
                                key={mc}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold"
                              >
                                ⭐ {mc}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action row */}
                        {createdRequestId && (
                          <Link
                            href={`/admin/requests/${createdRequestId}#match-${m.supplier_id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700"
                          >
                            View RFQ & Contact →
                          </Link>
                        )}
                      </div>
                    );
                  })}

                  {createdRequestId && (
                    <Link
                      href={`/admin/requests/${createdRequestId}`}
                      className="block w-full text-center py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition mt-1"
                    >
                      Open Full Match Workspace →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <span className="text-2xl">🏭</span>
                  <p>Select a buyer, write a brief, confirm it, and hit run to see instant matched factories right here.</p>
                  <p className="text-[11px] text-slate-300">Or click any request from the table below to load its matches.</p>
                </div>
              )}
            </div>

            {/* Quick Sourcing Metrics Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Deal Operations Overview
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-800/80 rounded-xl">
                  <div className="text-lg font-black text-amber-400">{initialCounts.total}</div>
                  <div className="text-[11px] text-slate-400">Active Requests</div>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl">
                  <div className="text-lg font-black text-emerald-400">{initialCounts.matched}</div>
                  <div className="text-[11px] text-slate-400">Matched with Factories</div>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl">
                  <div className="text-lg font-black text-sky-400">{initialCounts.highScore}</div>
                  <div className="text-[11px] text-slate-400">High Score ≥70%</div>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl">
                  <div className="text-lg font-black text-rose-400">{initialCounts.unmatched}</div>
                  <div className="text-[11px] text-slate-400">Awaiting Matching</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── VIEW 2: FULL TABULAR REGISTRY & MULTI-PROJECT RADAR ── */
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          {/* Registry navigation bar: return to the Intake Desk / resume the active request */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => switchTab("intake_desk")}
                className="font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                <span>←</span>
                <span>Back to Intake Desk</span>
              </button>
              <span className="text-slate-400 hidden sm:inline">
                Requests Registry · {requests.length} active requests
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {createdRequestId && (
                <Link
                  href={`/admin/requests/${createdRequestId}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition flex items-center gap-1"
                  title="Open the full Request Page & Outreach Hub for the active request"
                >
                  <span>📄</span>
                  <span>See Request Page</span>
                </Link>
              )}
              {(createdRequestId || projectTitle.trim()) && (
                <button
                  type="button"
                  onClick={() => switchTab("intake_desk")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 transition flex items-center gap-1 cursor-pointer max-w-xs"
                  title="Return to the request currently open in the Intake Desk"
                >
                  <span>✏️</span>
                  <span className="truncate">Edit: {projectTitle.trim() || "current draft"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleStartNewRequest}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Initial Request (New)</span>
              </button>
            </div>
          </div>
          <AgentCommandRadar
            requests={requests}
            onEditRequest={(req: RequestRow) => loadRequestForEdit(req)}
          />
          <div className="pt-6 border-t border-slate-200">
            <RequestsTable
              requests={requests}
              onEditRequest={(req: RequestRow) => loadRequestForEdit(req)}
              onNewRequest={handleStartNewRequest}
            />
          </div>
        </div>
      )}

      {/* ── EMAIL BUYER CONFIRMATION MODAL & PREVIEW ── */}
      {showEmailModal && selectedBuyer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center font-bold text-sm">
                  ✉️
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Review & Confirm Sourcing Brief Email
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify email contents and recipient before manual dispatch to {selectedBuyer.company_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">To (Buyer Contact):</span>
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md block truncate">
                      {selectedBuyer.contact_name ? `${selectedBuyer.contact_name} ` : ""}&lt;{selectedBuyer.contact_email}&gt;
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">From / Reply-To:</span>
                    <span className="text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md block truncate">
                      FoodXchange &lt;info@fdx.trading&gt; · BCC: udi@fdx.trading
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Subject Line:</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">
                    Optional Personal Note from Deal Desk:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Hi Sharon, following up on our call regarding Keto snacks, here is the exact brief for your review..."
                    value={emailCustomNotes}
                    onChange={(e) => setEmailCustomNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <strong>✓ Digital Approval Link Included:</strong> The email will contain a secure one-click link for the buyer to review the complete brief, examine multi-product cards, and click "Confirm" or "Request adjustments" without needing a password.
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 text-center sm:text-left">
                Manual trigger only. Review details above and click button to send.
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendConfirmedEmail}
                  disabled={sendingEmail}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Email to {selectedBuyer.contact_email}...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Confirm & Send Email to Buyer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN OVERRIDE MODAL ── */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
                  ✓
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Admin Manual Confirmation Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Use this when the buyer has approved the brief via phone call, WhatsApp, or meeting. This will immediately unlock European factory reverse-matching and log an "admin_override" audit record.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Confirmation Note (e.g. Approved by Sharon via Phone)
                </label>
                <textarea
                  rows={2}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Phone alignment on 2026-10-28; confirmed 1 container/month and private label."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdminOverrideConfirm}
                  disabled={isOverridingConfirm}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isOverridingConfirm ? "Confirming..." : "✓ Mark Confirmed & Unlock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING CLOUD SAVE & BRIEF STATUS ANNOUNCEMENT TOAST (Bottom-Right) ── */}
      {saveToast && saveToast.visible && (
        <div
          onMouseEnter={() => setToastHovered(true)}
          onMouseLeave={() => setToastHovered(false)}
          className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-full bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-200 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <div>
                <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>Cloud Draft Saved</span>
                  <span className="text-[10px] text-slate-400 font-mono">({saveToast.savedAt})</span>
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveToast(null)}
              className="text-slate-400 hover:text-white text-xs p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-slate-300 font-medium truncate">
              <span className="text-slate-400">Buyer:</span> <strong className="text-white">{saveToast.buyerName}</strong> • {saveToast.projectTitle}
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-slate-400">Brief Status:</span>
              {saveToast.briefStatus === "confirmed" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                  <span>✓</span>
                  <span>Confirmed by Buyer</span>
                </span>
              ) : saveToast.briefStatus === "sent" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                  <span>⏳</span>
                  <span>Waiting for Buyer Confirmation</span>
                </span>
              ) : saveToast.briefStatus === "changes_requested" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[11px] font-bold">
                  <span>✏️</span>
                  <span>Changes Requested by Buyer</span>
                </span>
              ) : saveToast.briefStatus === "reconfirm_needed" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                  <span>⚠️</span>
                  <span>Re-confirmation Needed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold">
                  <span>📝</span>
                  <span>Not Confirmed (Draft)</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            {saveToast.requestId ? (
              <Link
                href={`/admin/requests/${saveToast.requestId}`}
                target="_blank"
                className="text-xs font-bold text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1"
              >
                <span>Open Sourcing Brief</span>
                <span>→</span>
              </Link>
            ) : (
              <span className="text-[11px] text-slate-400">Brief ready for dispatch</span>
            )}

            {saveToast.briefStatus === "draft" && (
              <button
                type="button"
                onClick={() => {
                  setSaveToast(null);
                  handleOpenEmailPreviewModal();
                }}
                className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>✉️</span>
                <span>Email Buyer to Confirm</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SOFT DELETE CONFIRMATION MODAL ── */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold">
                🗑️
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Move Sourcing Request to Trash?</h3>
                <p className="text-xs text-slate-500">
                  This will archive the request. You can restore it anytime from Settings &gt; Trash & Archive.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div><strong>Project:</strong> {projectTitle || "Untitled Draft"}</div>
              {selectedBuyer && <div><strong>Buyer:</strong> {selectedBuyer.company_name}</div>}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletingRequest}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentRequest}
                disabled={deletingRequest}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingRequest ? "Moving to Trash..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
