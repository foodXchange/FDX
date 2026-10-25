"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

export interface SampleKitRow {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  whatsapp: string | null;
  product_name: string | null;
  category: string | null;
  packaging_preference: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
  session_id: string | null;
  internal_notes: string | null;
  ai_analysis: {
    sample_status?: string;
    tracking_code?: string;
    tracking_awb?: string;
    courier_name?: string;
    delivery_address?: string;
    target_tasting_date?: string;
    sample_format?: string;
    supplier_name?: string;
    country_of_origin?: string;
    sample_image_url?: string;
    sensory_scores?: {
      taste?: number;
      texture?: number;
      packaging?: number;
      viability?: number;
      overall?: number;
    };
    buyer_tasting_feedback?: string;
  } | null;
}

interface Props {
  initialSamples: SampleKitRow[];
}

const STAGES: { key: string; label: string; badgeCls: string }[] = [
  { key: "all", label: "All Kits", badgeCls: "bg-slate-800 text-slate-300" },
  { key: "new", label: "New Request", badgeCls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { key: "coordinating_factory", label: "Coordinating Factory", badgeCls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { key: "dispatched_air", label: "DHL In Transit", badgeCls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { key: "customs_tlv", label: "TLV Port Customs", badgeCls: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { key: "delivered", label: "Delivered to Table", badgeCls: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  { key: "feedback_approved", label: "Tasting Approved ✓", badgeCls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { key: "feedback_rejected", label: "Rejected / Reformulate", badgeCls: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
];

export default function AdminSamplesClient({ initialSamples }: Props) {
  const [samples, setSamples] = useState<SampleKitRow[]>(initialSamples);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  // Editable modal state
  const [editingAwb, setEditingAwb] = useState("");
  const [editingCourier, setEditingCourier] = useState("DHL Express");
  const [editingStatus, setEditingStatus] = useState("new");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingFeedback, setEditingFeedback] = useState("");
  const [scoreTaste, setScoreTaste] = useState<number>(5);
  const [scoreTexture, setScoreTexture] = useState<number>(5);
  const [scorePackaging, setScorePackaging] = useState<number>(5);
  const [scoreViability, setScoreViability] = useState<number>(5);
  const [saving, setSaving] = useState(false);

  // Group items by session_id (each session represents a Tasting Sample Box order)
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, SampleKitRow[]>();
    samples.forEach((row) => {
      const key = row.session_id || row.id;
      const arr = groups.get(key) || [];
      arr.push(row);
      groups.set(key, arr);
    });
    return Array.from(groups.values());
  }, [samples]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return groupedOrders.filter((orderItems) => {
      const first = orderItems[0];
      const status = first.ai_analysis?.sample_status || first.status || "new";

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCompany = first.company?.toLowerCase().includes(q) ?? false;
        const matchName = first.name?.toLowerCase().includes(q) ?? false;
        const matchTracking = first.ai_analysis?.tracking_code?.toLowerCase().includes(q) ?? false;
        const matchAwb = first.ai_analysis?.tracking_awb?.toLowerCase().includes(q) ?? false;
        const matchProduct = orderItems.some(
          (i) => i.product_name?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q)
        );
        if (!matchCompany && !matchName && !matchTracking && !matchAwb && !matchProduct) return false;
      }
      return true;
    });
  }, [groupedOrders, statusFilter, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    let newCount = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let approvedCount = 0;

    groupedOrders.forEach((order) => {
      const status = order[0]?.ai_analysis?.sample_status || order[0]?.status || "new";
      if (status === "new" || status === "coordinating_factory") newCount++;
      else if (status === "dispatched_air" || status === "customs_tlv") inTransitCount++;
      else if (status === "delivered") deliveredCount++;
      else if (status === "feedback_approved") approvedCount++;
    });

    return {
      total: groupedOrders.length,
      newCount,
      inTransitCount,
      deliveredCount,
      approvedCount,
    };
  }, [groupedOrders]);

  const openEditModal = (order: SampleKitRow[]) => {
    const first = order[0];
    setActiveModalId(first.id);
    setEditingStatus(first.ai_analysis?.sample_status || first.status || "new");
    setEditingAwb(first.ai_analysis?.tracking_awb || "");
    setEditingCourier(first.ai_analysis?.courier_name || "DHL Express");
    setEditingNotes(first.internal_notes || "");
    setEditingFeedback(first.ai_analysis?.buyer_tasting_feedback || "");

    const scores = first.ai_analysis?.sensory_scores;
    setScoreTaste(scores?.taste || 5);
    setScoreTexture(scores?.texture || 5);
    setScorePackaging(scores?.packaging || 5);
    setScoreViability(scores?.viability || 5);
  };

  const handleSaveModal = async (primaryId: string, orderItems: SampleKitRow[]) => {
    setSaving(true);
    try {
      // Update each item in the session
      await Promise.all(
        orderItems.map((item) =>
          fetch(`/api/admin/samples/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: editingStatus,
              tracking_awb: editingAwb,
              courier_name: editingCourier,
              internal_notes: editingNotes,
              buyer_tasting_feedback: editingFeedback,
              sensory_scores: {
                taste: scoreTaste,
                texture: scoreTexture,
                packaging: scorePackaging,
                viability: scoreViability,
              },
            }),
          })
        )
      );

      // Update state locally
      setSamples((prev) =>
        prev.map((item) => {
          if (orderItems.some((oi) => oi.id === item.id)) {
            return {
              ...item,
              status: editingStatus,
              internal_notes: editingNotes,
              ai_analysis: {
                ...item.ai_analysis,
                sample_status: editingStatus,
                tracking_awb: editingAwb,
                courier_name: editingCourier,
                buyer_tasting_feedback: editingFeedback,
                sensory_scores: {
                  taste: scoreTaste,
                  texture: scoreTexture,
                  packaging: scorePackaging,
                  viability: scoreViability,
                  overall: Number(
                    ((scoreTaste + scoreTexture + scorePackaging + scoreViability) / 4).toFixed(1)
                  ),
                },
              },
            };
          }
          return item;
        })
      );

      setActiveModalId(null);
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to update sample request.");
    } finally {
      setSaving(false);
    }
  };

  const generateWhatsAppCourierUpdate = (order: SampleKitRow[]) => {
    const first = order[0];
    const phone = first.whatsapp?.replace(/[^0-9]/g, "") || "";
    const cleanPhone = phone.startsWith("0") ? `972${phone.slice(1)}` : phone;
    const awb = first.ai_analysis?.tracking_awb || editingAwb;
    const trackingCode = first.ai_analysis?.tracking_code || `FDX-SMP-${first.id.slice(0, 6)}`;

    const liveTrackingUrl = `https://fdx.trading/he/track?code=${trackingCode}`;

    let msg = "";
    if (first.status === "dispatched_air") {
      msg = `שלום ${first.name || "קניין יקר"}, ערכת הדוגמאות של ${first.company || "הרשת"} (#${trackingCode}) שוגרה כעת מאירופה ב-DHL Express!
✈️ מספר מעקב למשלוח: ${awb || "נשלח בהודעה עוקבת"}
קישור למעקב ישיר ב-DHL: https://www.dhl.com/en/express/tracking.html?AWB=${awb}
📱 ציר זמן חי ב-FoodXchange: ${liveTrackingUrl}
צפי מסירה בשולחן הטעימות: תוך 3-4 ימי עסקים. צוות FoodXchange לשירותך.`;
    } else if (first.status === "delivered") {
      msg = `שלום ${first.name || "קניין יקר"}, ערכת הדוגמאות (#${trackingCode}) נמסרה כעת למשרדי ${first.company || "הרשת"}.
נשמח לתיאום רשמי של שולחן הטעימות והערכת האיכות מול היצרן האירופי לקראת גיבוש הצעת מחיר למכולה ראשונה.
⭐️ למילוי משוב טעימות ודירוג איכות דיגיטלי: ${liveTrackingUrl}`;
    } else {
      msg = `שלום ${first.name || "קניין יקר"}, עדכון מ-FoodXchange לגבי ערכת הדוגמאות (#${trackingCode}) עבור ${first.company || "הרשת"}: הבקשה נמצאת בסטטוס: ${first.status}.
📱 מעקב חי: ${liveTrackingUrl}`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & KPIS ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>📦</span>
            <span>Tasting Samples Desk</span>
          </h1>
          <p className="text-xs text-slate-500">
            Dispatch, track, and score institutional tasting sample boxes for Israeli supermarket buyers
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 shadow-2xs font-semibold">
            {groupedOrders.length} Sample Orders Active
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            New & Sourcing
          </span>
          <div className="text-2xl font-black text-blue-600 font-mono">{kpis.newCount}</div>
          <span className="text-[10px] text-slate-400">Coordinating EU plant dispatch</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            DHL In Flight & Port
          </span>
          <div className="text-2xl font-black text-orange-600 font-mono">{kpis.inTransitCount}</div>
          <span className="text-[10px] text-slate-400">Air courier / TLV Gateway</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            At Tasting Table
          </span>
          <div className="text-2xl font-black text-teal-600 font-mono">{kpis.deliveredCount}</div>
          <span className="text-[10px] text-slate-400">Delivered to retail HQ</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Sensory Approved
          </span>
          <div className="text-2xl font-black text-emerald-600 font-mono">{kpis.approvedCount}</div>
          <span className="text-[10px] text-slate-400">Ready for PO issuance</span>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === s.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search retail chain, buyer, tracking..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── ORDERS LIST ── */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <span className="text-4xl block">📦</span>
          <p className="text-sm font-bold text-slate-700">No sample box orders found</p>
          <p className="text-xs text-slate-400">
            Sample requests submitted from the Hebrew or English product catalog will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((orderItems) => {
            const first = orderItems[0];
            const status = first.ai_analysis?.sample_status || first.status || "new";
            const trackingCode = first.ai_analysis?.tracking_code || `FDX-SMP-${first.id.slice(0, 6)}`;
            const awb = first.ai_analysis?.tracking_awb;
            const courier = first.ai_analysis?.courier_name || "DHL Express";
            const address = first.ai_analysis?.delivery_address;
            const tastingDate = first.ai_analysis?.target_tasting_date;
            const sensory = first.ai_analysis?.sensory_scores;

            const stageMeta = STAGES.find((s) => s.key === status) || STAGES[1];

            return (
              <div
                key={first.session_id || first.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs p-5 transition space-y-4"
              >
                {/* Header Row: Tracking, Company, Date, Stage */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black bg-slate-900 text-orange-400 px-2.5 py-1 rounded-md">
                      {trackingCode}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {first.company || "Israeli Retailer"}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>👤 {first.name || "Category Buyer"}</span>
                        <span>·</span>
                        <span>📞 {first.whatsapp || "No phone"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${stageMeta.badgeCls}`}
                    >
                      {stageMeta.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(first.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </div>

                {/* Products in this Tasting Box */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Products in Kit ({orderItems.length}):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-start gap-2.5"
                      >
                        <div className="relative w-10 h-10 rounded-lg bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                          {item.ai_analysis?.sample_image_url ? (
                            <Image
                              src={item.ai_analysis.sample_image_url}
                              alt={item.product_name || "Product"}
                              fill
                              className="object-contain p-0.5"
                            />
                          ) : (
                            <span className="text-sm">📦</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-800 truncate">
                            {item.product_name}
                          </h4>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.ai_analysis?.supplier_name || "European Factory"} ·{" "}
                            {item.category}
                          </div>
                          {item.ai_analysis?.sample_format && (
                            <div className="text-[10px] text-orange-600 font-medium">
                              Format: {item.ai_analysis.sample_format}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery & Courier Intel Bar */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Delivery Destination:</span>
                    <span className="font-semibold text-slate-800">
                      {address || "Israeli Distribution Center"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Target Tasting Date:</span>
                    <span className="font-semibold text-slate-800">
                      {tastingDate || "Earliest available"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Courier Tracking:</span>
                    {awb ? (
                      <a
                        href={`https://www.dhl.com/en/express/tracking.html?AWB=${awb}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-orange-600 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>{courier}: {awb}</span>
                        <span>↗</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No AWB assigned yet</span>
                    )}
                  </div>
                </div>

                {/* Sensory Scores (if recorded) */}
                {sensory?.overall && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-800 text-sm">
                        Sensory Score: {sensory.overall} / 5.0 ⭐
                      </span>
                      <span className="text-emerald-700">
                        Taste: {sensory.taste}/5 · Texture: {sensory.texture}/5 · Packaging:{" "}
                        {sensory.packaging}/5
                      </span>
                    </div>
                    {first.ai_analysis?.buyer_tasting_feedback && (
                      <p className="text-slate-600 italic text-xs max-w-md">
                        &ldquo;{first.ai_analysis.buyer_tasting_feedback}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(orderItems)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚙️</span>
                      <span>Update Status & Tracking</span>
                    </button>

                    <a
                      href={generateWhatsAppCourierUpdate(orderItems)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>💬</span>
                      <span>WhatsApp Buyer</span>
                    </a>

                    {status === "feedback_approved" && (
                      <Link
                        href={`/admin/deals?new=1&from_sample=${first.id}&buyer=${encodeURIComponent(first.company || "")}&product=${encodeURIComponent(first.product_name || "")}&supplier=${encodeURIComponent(first.ai_analysis?.supplier_name || "")}`}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>⚡</span>
                        <span>Issue Commercial Pro-Forma PO</span>
                      </Link>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400">
                    ID: {first.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── EDIT / STATUS MODAL ── */}
      {activeModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span>📦</span>
                <span>Update Tasting Sample Dispatch</span>
              </h3>
              <button
                onClick={() => setActiveModalId(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Select */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Pipeline Stage:</label>
                <select
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="new">New Request (Unprocessed)</option>
                  <option value="coordinating_factory">Coordinating Factory Collection</option>
                  <option value="dispatched_air">Dispatched (DHL/FedEx Air Cargo)</option>
                  <option value="customs_tlv">At TLV Port Customs Inspection</option>
                  <option value="delivered">Delivered to Retail Tasting Table</option>
                  <option value="feedback_approved">Approved in Tasting (Move to PO Release)</option>
                  <option value="feedback_rejected">Rejected in Tasting / Need Alternative</option>
                </select>
              </div>

              {/* Courier & AWB */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Courier Provider:</label>
                  <select
                    value={editingCourier}
                    onChange={(e) => setEditingCourier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="DHL Express">DHL Express</option>
                    <option value="FedEx">FedEx International</option>
                    <option value="UPS">UPS Worldwide</option>
                    <option value="Special Cargo">Direct Air Cargo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Air Waybill (AWB):</label>
                  <input
                    type="text"
                    value={editingAwb}
                    onChange={(e) => setEditingAwb(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Sensory Evaluation Scoring */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                <span className="font-bold text-slate-800 block text-xs">
                  ⭐ 5-Dimension Sensory Evaluation Score (1 to 5):
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-600 block">Taste & Flavor Profile:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={scoreTaste}
                      onChange={(e) => setScoreTaste(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block">Texture & Viscosity:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={scoreTexture}
                      onChange={(e) => setScoreTexture(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block">Packaging & Drained Weight:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={scorePackaging}
                      onChange={(e) => setScorePackaging(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block">Commercial Viability / Price:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={scoreViability}
                      onChange={(e) => setScoreViability(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1 text-center font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Buyer Tasting Feedback */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Buyer Tasting Notes & Reaction:</label>
                <textarea
                  rows={2}
                  value={editingFeedback}
                  onChange={(e) => setEditingFeedback(e.target.value)}
                  placeholder="e.g. Olive oil approved unanimously by panel. Low acidity praised. Buyer requested 2x 40ft HC quote."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Internal Admin Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Internal Deal Desk Notes:</label>
                <textarea
                  rows={2}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Notes for logistics / export manager..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModalId(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const targetOrder = groupedOrders.find((o) =>
                    o.some((item) => item.id === activeModalId)
                  );
                  if (targetOrder) {
                    handleSaveModal(activeModalId, targetOrder);
                  }
                }}
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {saving ? "Saving..." : "Save Updates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
