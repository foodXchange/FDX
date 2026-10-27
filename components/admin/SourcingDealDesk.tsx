"use client";

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createRequestForBuyer,
  createQuickBuyer,
  type CreateQuickBuyerInput,
} from "@/app/admin/requests/actions";
import type { RequestRow } from "@/app/admin/requests/page";
import RequestsTable from "@/components/admin/RequestsTable";
import AgentCommandRadar from "@/components/admin/AgentCommandRadar";

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

export default function SourcingDealDesk({ buyers: initialBuyers, requests, initialCounts }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active View mode: Unified Split-Screen vs Full Tabular Registry
  const [activeTab, setActiveTab] = useState<"intake_desk" | "registry_table">("intake_desk");

  // 1. Buyer Selection State
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

  // Filtered buyers for instant combobox search
  const filteredBuyers = useMemo(() => {
    if (!buyerSearchQuery.trim()) return buyersList.slice(0, 8);
    const q = buyerSearchQuery.toLowerCase();
    return buyersList.filter(
      (b) =>
        b.company_name.toLowerCase().includes(q) ||
        (b.contact_name && b.contact_name.toLowerCase().includes(q)) ||
        (b.website && b.website.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [buyersList, buyerSearchQuery]);

  // 2. Project & Sourcing Form State
  const [projectTitle, setProjectTitle] = useState("");
  const [benchmarkBrands, setBenchmarkBrands] = useState("");
  const [category, setCategory] = useState("");
  const [packagingFormat, setPackagingFormat] = useState("Retail Shelf Packs (Consolidated Mixed Container)");
  const [estimatedVolume, setEstimatedVolume] = useState("1 x 40ft HQ FCL / month (Mixed Pallets)");
  const [brandingModel, setBrandingModel] = useState<"supplier_brand" | "private_label" | "open">("supplier_brand");
  const [targetMarket, setTargetMarket] = useState("Israel");
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Gluten Free",
    "Sugar Free",
    "Kosher (Chief Rabbinate)",
    "BRC",
  ]);
  const [naturalBrief, setNaturalBrief] = useState("");

  // Machine Vision & Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [analysingVision, setAnalysingVision] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pasteUrlInput, setPasteUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [visionData, setVisionData] = useState<any>(null);
  const [visionSummary, setVisionSummary] = useState<string | null>(null);

  // Email Confirmation to Buyer state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Draft Saving & Persistence state
  const [savedDraftNotice, setSavedDraftNotice] = useState<string | null>(null);

  // Submission & Live Matches display
  const [isSubmitting, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [fetchingMatches, setFetchingMatches] = useState(false);

  // Select a buyer from combobox
  function handleSelectBuyer(b: BuyerOption) {
    setSelectedBuyer(b);
    setBuyerSearchQuery(b.company_name);
    setTargetMarket(b.country || "Israel");
  }

  // Toggle dietary / certification tag
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

  // Handle File Uploads (Multiple files, No Auto-Analyze)
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
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          newUrls.push(uploadData.url);
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

  // Handle Pasting Image URL directly
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

  // Explicit Button-Triggered Analysis for 1 or more images
  async function handleAnalyzeImages() {
    if (imageUrls.length === 0) {
      setErrorMsg("Please upload files or paste at least one image URL first.");
      return;
    }
    setAnalysingVision(true);
    setErrorMsg(null);

    try {
      const extractedNotes: string[] = [];
      let lastAnalysis: any = null;

      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const visionRes = await fetch("/api/sourcing/analyse-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url }),
        });
        const data = await visionRes.json();
        if (data?.analysis) {
          const a = data.analysis;
          lastAnalysis = a;
          const pName = a.product_name?.value || a.product_name || a.product_noun?.value || "";
          const pBrand = a.benchmark_brand?.value || a.brand?.value || "";
          const certs = a.certifications_visible?.value || a.certifications_visible || [];
          const kMarks = a.kosher_marks_visible?.value || a.kosher_marks_visible || [];
          const rawOcr = a.raw_text_ocr ? ` (OCR: ${a.raw_text_ocr.slice(0, 150)}...)` : "";

          extractedNotes.push(
            `• Visual Spec #${i + 1}: ${[pName, pBrand ? `Brand: ${pBrand}` : "", certs.length ? `Certs: ${certs.join(",")}` : "", kMarks.length ? `Kosher: ${kMarks.join(",")}` : ""].filter(Boolean).join(" | ")}${rawOcr}`
          );

          if (!projectTitle && pName) {
            setProjectTitle(pName);
          }
          if (!benchmarkBrands && pBrand) {
            setBenchmarkBrands(pBrand);
          }
        }
      }

      setVisionData(lastAnalysis);
      const combinedSummary = extractedNotes.join("\n");
      setVisionSummary(combinedSummary);

      // Append extracted visual specifications directly into Project Brief
      setNaturalBrief((prev) => {
        const header = "\n\n[📸 Extracted Visual Product Specifications]:\n";
        if (prev.includes("[📸 Extracted Visual Product Specifications]")) {
          return prev;
        }
        return prev ? `${prev}${header}${combinedSummary}` : combinedSummary;
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Vision extraction error");
    } finally {
      setAnalysingVision(false);
    }
  }

  // Manually triggered Email to Buyer to Confirm Sourcing Brief
  async function handleEmailBuyerConfirmation() {
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

    setSendingEmail(true);
    setEmailNotice(null);

    try {
      const res = await fetch("/api/admin/requests/confirm-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to dispatch confirmation email");
      }

      setEmailNotice({
        type: "success",
        text: `Confirmation email dispatched to ${selectedBuyer.contact_email}${data.simulated ? " (simulated)" : ""}!`,
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

  // Save current project content locally
  const handleSaveDraft = () => {
    try {
      const draft = {
        buyerId: selectedBuyer?.id || null,
        buyerSearchQuery,
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
        savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      localStorage.setItem("fdx_deal_desk_draft", JSON.stringify(draft));
      setSavedDraftNotice(`✓ Draft saved at ${draft.savedAt}`);
      setTimeout(() => setSavedDraftNotice(null), 3500);
    } catch (err) {
      console.error("Failed to save draft:", err);
    }
  };

  // Restore saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fdx_deal_desk_draft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.projectTitle) setProjectTitle(d.projectTitle);
        if (d.benchmarkBrands) setBenchmarkBrands(d.benchmarkBrands);
        if (d.category) setCategory(d.category);
        if (d.packagingFormat) setPackagingFormat(d.packagingFormat);
        if (d.estimatedVolume) setEstimatedVolume(d.estimatedVolume);
        if (d.brandingModel) setBrandingModel(d.brandingModel);
        if (d.targetMarket) setTargetMarket(d.targetMarket);
        if (Array.isArray(d.selectedTags) && d.selectedTags.length > 0) setSelectedTags(d.selectedTags);
        if (d.naturalBrief) setNaturalBrief(d.naturalBrief);
        if (Array.isArray(d.imageUrls)) setImageUrls(d.imageUrls);
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
  }, [initialBuyers]);

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

  // Submit Project & Run Real-Time Reverse Match
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

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await createRequestForBuyer({
          buyer_id: selectedBuyer.id,
          name: selectedBuyer.contact_name || selectedBuyer.company_name,
          email: selectedBuyer.contact_email,
          company: selectedBuyer.company_name,
          product_name: projectTitle,
          category: category || null,
          benchmark_brand: benchmarkBrands || null,
          packaging_preference: packagingFormat || null,
          volume_per_year: estimatedVolume || null,
          message: naturalBrief || null,
          certifications: selectedTags,
          target_market: targetMarket || "Israel",
          private_label: brandingModel === "private_label" ? true : brandingModel === "supplier_brand" ? false : null,
          image_urls: imageUrls,
          ai_analysis: visionData || null,
        });

        if (!res.ok) {
          setErrorMsg(res.error);
          return;
        }

        setCreatedRequestId(res.id);

        // Fetch live matches immediately
        setFetchingMatches(true);
        const matchRes = await fetch(`/api/admin/requests/quick-matches?request_id=${res.id}`);
        const matchJson = await matchRes.json();
        setLiveMatches(matchJson.matches || []);
        setFetchingMatches(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to submit request");
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50/70">
      {/* ── TOP STICKY OPERATIONAL BAR ── */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6 py-3 sticky top-0 z-20 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center font-bold text-sm">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Sourcing Deal Desk
                </h1>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Unified Console
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Capture buyer briefs, drop packaging shots, email buyer confirmation, and match 80k+ European factories
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Draft status & quick save button */}
            {savedDraftNotice && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-in fade-in flex items-center gap-1">
                <span>✓</span>
                <span>{savedDraftNotice}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              title="Save project draft locally (Ctrl+S)"
            >
              <span>💾</span>
              <span>Save Draft</span>
              <kbd className="hidden sm:inline-block text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-500 font-mono border border-slate-200">
                Ctrl+S
              </kbd>
            </button>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setActiveTab("intake_desk")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "intake_desk"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>✨</span>
                <span>Quick Intake & Matcher</span>
              </button>
              <button
                onClick={() => setActiveTab("registry_table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "registry_table"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📋</span>
                <span>All Requests Registry ({initialCounts.total})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: UNIFIED SPLIT-SCREEN WORKSPACE ── */}
      {activeTab === "intake_desk" ? (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT PANEL: INTAKE & BRIEF COMPOSER (col 7) ── */}
          <form
            onSubmit={handleSubmitProject}
            className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
          >
            {/* Step 1: Buyer Search & Auto-Fill */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Select or Register Buyer</span>
                  {selectedBuyer && (
                    <span className="text-emerald-600 normal-case font-semibold">
                      (✓ Selected: {selectedBuyer.company_name})
                    </span>
                  )}
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
                <div className="p-4 mb-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3 animate-in fade-in duration-150">
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
                      className="text-xs font-bold px-4 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
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

                {/* Combobox Suggestions List */}
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
                <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-[10px]">
                      {selectedBuyer.company_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900">{selectedBuyer.company_name}</span>
                      <span className="text-slate-500 ml-2">{selectedBuyer.contact_email}</span>
                      {selectedBuyer.website && (
                        <a
                          href={selectedBuyer.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 ml-2 hover:underline text-[11px]"
                        >
                          {selectedBuyer.website.replace("https://", "").replace("http://", "")} ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBuyer(null);
                      setBuyerSearchQuery("");
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Project Scope & Product Title */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                2. Sourcing Project & Target Products
              </label>

              <div>
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
                    placeholder="e.g. Gullon Zero, Dr. Schär, Nutrifree, Barilla"
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
                    <option value="supplier_brand">Factory Branded Line (Strong Brand Equity)</option>
                    <option value="private_label">Private Label (Buyer's Own Label OEM)</option>
                    <option value="open">Open to Both</option>
                  </select>
                </div>
              </div>

              {/* Dietary & Certifications Quick Tags */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Dietary Attributes & Audit Certifications
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DIETARY_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          active
                            ? "bg-orange-100 text-orange-900 border-orange-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 3: Natural Chat Brief & Machine Vision */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Project Brief
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEmailBuyerConfirmation}
                    disabled={sendingEmail}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                    title={
                      selectedBuyer?.contact_email
                        ? `Send confirmed brief to ${selectedBuyer.contact_email}`
                        : "Select a buyer with an email to send brief confirmation"
                    }
                  >
                    <span>✉️</span>
                    <span>{sendingEmail ? "Sending Confirmation Email..." : "Email Buyer to Confirm Sourcing Brief"}</span>
                  </button>
                </div>
              </div>

              {/* Email Feedback Notice */}
              {emailNotice && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition animate-in fade-in ${
                    emailNotice.type === "success"
                      ? "bg-sky-50 border border-sky-200 text-sky-800"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{emailNotice.type === "success" ? "✓" : "⚠️"}</span>
                    <span>{emailNotice.text}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmailNotice(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                rows={3}
                placeholder="Describe what the buyer asked (e.g. Sharon from Intergood wants a consolidated 40ft mixed container with branded Keto, Sugar-Free and Gluten-Free snacks from large manufacturers, CIF Ashdod terms)..."
                value={naturalBrief}
                onChange={(e) => setNaturalBrief(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-orange-500 focus:bg-white leading-relaxed"
              />

              {/* ── ROBUST MULTI-IMAGE & URL MACHINE VISION STUDIO ── */}
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/70 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📸</span>
                    <span className="font-bold text-slate-800">Product Packaging & Visual Assets</span>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-semibold">
                      Gemini 3.8 Flash Vision
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        handleFileUpload(e.target.files);
                        if (e.target) e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold cursor-pointer shadow-2xs transition"
                    >
                      <span>📁</span>
                      <span>{uploadingImage ? "Uploading..." : "+ Upload Images"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold cursor-pointer shadow-2xs transition"
                    >
                      <span>🔗</span>
                      <span>+ Paste Image URL</span>
                    </button>
                  </div>
                </div>

                {/* Direct Image URL Paste Input Bar */}
                {showUrlInput && (
                  <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                    <input
                      type="url"
                      placeholder="Paste direct image link (e.g. https://domain.com/choczero-pack.jpg)..."
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
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Staged Images Gallery with Delete Controls */}
                {imageUrls.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{imageUrls.length} image(s) staged for analysis</span>
                      <button
                        type="button"
                        onClick={handleAnalyzeImages}
                        disabled={analysingVision}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold hover:opacity-95 shadow-xs cursor-pointer disabled:opacity-50 transition"
                      >
                        <span>✨</span>
                        <span>{analysingVision ? "Analyzing Images with AI..." : "Run AI Vision Analysis & Insert to Brief"}</span>
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
                            onError={(e) => {
                              // Fallback display if URL image cannot be previewed
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white text-[11px] flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-rose-600 transition cursor-pointer"
                            title="Delete image"
                          >
                            ✕
                          </button>
                          <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded-sm">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Upload pack shots or paste image URLs. Click "Run AI Vision Analysis" when ready to extract OCR labels, brand, and kosher marks into the project brief.
                  </p>
                )}

                {visionSummary && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 leading-relaxed">
                    <strong className="block font-bold mb-0.5">✓ Visual Specs Added to Project Brief:</strong>
                    <div className="whitespace-pre-wrap text-emerald-800">{visionSummary}</div>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Submit & Save Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer transition flex items-center justify-center gap-2 shadow-2xs"
                title="Save draft locally (Ctrl+S)"
              >
                <span>💾</span>
                <span>Save Draft</span>
                <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-500 font-mono border border-slate-200">
                  Ctrl+S
                </kbd>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 w-full py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-sm hover:opacity-95 shadow-md shadow-orange-500/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Matching across 80,000+ European Catalog Items...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Create Sourcing Request & Run Reverse-Match</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── RIGHT PANEL: LIVE MATCHES & RECENT PROJECTS (col 5) ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Live Matches Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {liveMatches.length > 0 ? "🎯 Factory Reverse-Matches" : "Live Sourcing Feed"}
                  </h3>
                </div>
                {createdRequestId && (
                  <Link
                    href={`/admin/requests/${createdRequestId}`}
                    className="text-xs font-bold text-orange-600 hover:underline"
                  >
                    Open Workspace →
                  </Link>
                )}
              </div>

              {fetchingMatches ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Ranking European factories by certifications & specs...</p>
                </div>
              ) : liveMatches.length > 0 ? (
                <div className="space-y-3">
                  {liveMatches.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-orange-50/50 border border-slate-200/80 transition text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{m.company_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          {m.match_score}% Match
                        </span>
                      </div>
                      <div className="text-slate-600">{m.product_name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>📍 {m.country || "Europe"}</span>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">BRC / IFS Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <span className="text-2xl">🏭</span>
                  <p>Select a buyer, write a project brief, and hit run to see instant matched factories right here.</p>
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
          <AgentCommandRadar requests={requests} />
          <div className="pt-6 border-t border-slate-200">
            <RequestsTable requests={requests} />
          </div>
        </div>
      )}
    </main>
  );
}
