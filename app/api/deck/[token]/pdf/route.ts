import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = Promise<{ token: string }>;

interface FactoryItem {
  company_name: string;
  country: string;
  flag: string;
  region?: string;
  product_name: string;
  format?: string;
  certifications: string[];
  kosher_type: string;
  indicative_price?: string;
  moq?: string;
  lead_time?: string;
  image_url?: string;
  specs: string[];
}

interface DeckPayload {
  deck_type?: string;
  category?: string;
  target_retailer?: string;
  buyer_contact?: string;
  personal_note?: string;
  factories?: FactoryItem[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { token } = await params;
  const lang = req.nextUrl.searchParams.get("lang") === "he" ? "he" : "en";
  const isHe = lang === "he";

  const { data: proposal, error } = await supabaseAdmin
    .from("proposals")
    .select("*")
    .eq("token", token)
    .eq("status", "active")
    .single();

  if (error || !proposal) {
    return new Response(isHe ? "מצגת הספקים פגה או לא נמצאה." : "Proposal deck not found or expired.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let payload: DeckPayload = {};
  try {
    payload = JSON.parse(proposal.personal_message || "{}");
  } catch {
    payload = {};
  }

  const factories = payload.factories || [];
  const title = proposal.title || (isHe ? "מצגת בחירת יצרני מזון מאירופה" : "European Manufacturer Assortment Selection");
  const buyerName = proposal.buyer_name || (isHe ? "קניין רשת" : "Retail Buyer");
  const buyerCompany = proposal.buyer_company || payload.target_retailer || (isHe ? "מחלקת סחר ורכש" : "Retail Desk");
  const category = payload.category || (isHe ? "איתור ספקים ומותג פרטי" : "Specialty Sourcing");
  const note = payload.personal_note || "";

  // Build Matrix Rows
  const matrixRows = factories
    .map(
      (f, i) => `
    <tr>
      <td style="font-weight:700; color:#0f172a;">${i + 1}. ${escapeHtml(f.company_name)}</td>
      <td>${f.flag} ${escapeHtml(f.country)}</td>
      <td style="font-weight:600; color:#c2410c;">${escapeHtml(f.product_name)}</td>
      <td>${escapeHtml(f.format || (isHe ? "סטנדרטי" : "Standard"))}</td>
      <td><span class="badge badge-cert">${f.certifications.length > 0 ? escapeHtml(f.certifications.join(", ")) : "ISO 22000"}</span></td>
      <td><span class="badge badge-kosher">${escapeHtml(f.kosher_type || (isHe ? "אישור רבנות" : "Rabbinate"))}</span></td>
      <td style="font-weight:700; color:#15803d;">${escapeHtml(f.indicative_price || (isHe ? "לפי פנייה" : "Inquire"))}</td>
      <td style="font-size:11px; color:#64748b;">${escapeHtml(f.moq || (isHe ? "מכולה 1" : "1 FCL"))}</td>
    </tr>`
    )
    .join("");

  // Build Factory Deep-Dive Slides
  const factorySlides = factories
    .map(
      (f, i) => `
  <div class="page factory-slide">
    <div class="header">
      <div class="header-brand">${isHe ? 'Food<span>X</span>change &middot; סקירה מעמיקה של מפעל אירופאי' : 'Food<span>X</span>change &middot; European Factory Deep Dive'}</div>
      <div class="header-meta">${isHe ? `אפשרות ${i + 1} מתוך ${factories.length} &middot; ${escapeHtml(category)}` : `Option ${i + 1} of ${factories.length} &middot; ${escapeHtml(category)}`}</div>
    </div>

    <div class="factory-layout">
      <!-- Details Column -->
      <div class="factory-details">
        <div class="factory-title-wrap">
          <span class="country-pill">${f.flag} ${escapeHtml(f.country)}${f.region ? ` &middot; ${escapeHtml(f.region)}` : ""}</span>
          <h2 class="factory-name">${escapeHtml(f.company_name)}</h2>
          <p class="factory-product">${escapeHtml(f.product_name)}</p>
        </div>

        <div class="specs-grid">
          <div class="spec-card">
            <span class="spec-label">${isHe ? "מחיר יעד CIF חיפה / אשדוד" : "Target CIF Haifa / Ashdod"}</span>
            <span class="spec-val text-green">${escapeHtml(f.indicative_price || (isHe ? "הצעת מחיר למכולה" : "Quoted per container"))}</span>
          </div>
          <div class="spec-card">
            <span class="spec-label">${isHe ? "כמות מינימום להזמנה (MOQ)" : "Minimum Order Qty (MOQ)"}</span>
            <span class="spec-val">${escapeHtml(f.moq || (isHe ? "מכולה 20/40 רגל" : "1 x 20ft / 40ft FCL"))}</span>
          </div>
          <div class="spec-card">
            <span class="spec-label">${isHe ? "זמן אספקה וייצור (Lead Time)" : "Production &amp; Shipping Lead Time"}</span>
            <span class="spec-val">${escapeHtml(f.lead_time || (isHe ? "3–4 שבועות" : "3 to 4 weeks"))}</span>
          </div>
          <div class="spec-card">
            <span class="spec-label">${isHe ? "תצורת אריזה ומיתוג" : "Packaging &amp; Format"}</span>
            <span class="spec-val">${escapeHtml(f.format || (isHe ? "קמעונאי / מותג פרטי" : "Retail / HoReCa"))}</span>
          </div>
        </div>

        <div class="compliance-box">
          <div class="compliance-row">
            <span class="comp-label">${isHe ? "🛡️ תקני איכות ובטיחות מזון:" : "🛡️ Food Safety Certifications:"}</span>
            <span class="comp-val">${f.certifications.length > 0 ? f.certifications.map(c => `<span class="pill-cert">${escapeHtml(c)}</span>`).join(" ") : '<span class="pill-cert">IFS Higher Level</span> <span class="pill-cert">BRC Grade A</span>'}</span>
          </div>
          <div class="compliance-row">
            <span class="comp-label">${isHe ? "✡ נתיב כשרות מותאם ליבוא לישראל:" : "✡ Kosher Supervision Feasibility:"}</span>
            <span class="comp-val text-orange"><strong>${escapeHtml(f.kosher_type || (isHe ? "רבנות ראשית (אישור הרה״ר)" : "Chief Rabbinate of Israel (אישור הרה״ר)"))}</strong> &middot; ${isHe ? "נתיב פיקוח רבני מאומת לשחרור מכס בישראל" : "Kosher certification supported"}</span>
          </div>
        </div>

        ${f.specs.length > 0 ? `
        <div class="tech-specs">
          <span class="tech-title">${isHe ? "מפרט טכני ודגשי איכות מסחריים:" : "Key Quality Specifications &amp; Commercial Notes:"}</span>
          <ul class="tech-list">
            ${f.specs.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
          </ul>
        </div>` : ""}
      </div>

      <!-- Visual Packshot / Plant Column -->
      <div class="factory-visual">
        ${f.image_url ? `
          <img src="${escapeHtml(f.image_url)}" alt="${escapeHtml(f.product_name)}" class="factory-img" />
        ` : `
          <div class="placeholder-img">
            <span style="font-size:64px;">📦</span>
            <p style="font-size:13px; font-weight:600; color:#64748b; margin-top:8px;">${escapeHtml(f.product_name)}</p>
            <p style="font-size:11px; color:#94a3b8;">${isHe ? "מפעל אירופאי מאומת" : "European Plant"} &middot; ${escapeHtml(f.country)}</p>
          </div>
        `}
        <div class="sample-callout">
          <span>${isHe ? "📦 דוגמאות לטעימה זמינות במשלוח אקספרס (DHL/FedEx)" : "📦 Tasting Samples Available via Express Courier (DHL/FedEx)"}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>${isHe ? `FoodXchange &middot; fdx.trading &middot; הוכן עבור ${escapeHtml(buyerCompany)}` : `FoodXchange &middot; fdx.trading &middot; Prepared for ${escapeHtml(buyerCompany)}`}</span>
      <span>${isHe ? `סודי ומסחרי &middot; עמוד ${i + 3}` : `Confidential &middot; Page ${i + 3}`}</span>
    </div>
  </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${isHe ? "he" : "en"}" dir="${isHe ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} | ${isHe ? "מצגת בחירת מפעלים מאירופה | FoodXchange" : "FoodXchange B2B Assortment Deck"}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ${isHe ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Heebo", "Assistant", Arial, sans-serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'};
      background: #0f172a;
      color: #0f172a;
    }
    .print-controls {
      position: fixed;
      top: 16px;
      ${isHe ? "left: 16px;" : "right: 16px;"}
      z-index: 9999;
      display: flex;
      gap: 8px;
      background: rgba(15, 23, 42, 0.9);
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .btn-action {
      background: #F47920;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-action:hover { background: #d96810; }
    .btn-close {
      background: #334155;
      color: #e2e8f0;
      border: none;
      padding: 8px 12px;
      font-size: 13px;
      border-radius: 8px;
      cursor: pointer;
    }
    @media print {
      .print-controls { display: none !important; }
      body { background: #fff; }
    }
    .page {
      width: 297mm;
      height: 210mm;
      page-break-after: always;
      position: relative;
      background: #ffffff;
      overflow: hidden;
      padding: 16mm 18mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Cover Slide */
    .cover-page {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: #ffffff;
      padding: 22mm 24mm;
    }
    .cover-top { display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; }
    .logo span { color: #F47920; }
    .tagline-pill {
      background: rgba(244, 121, 32, 0.15);
      border: 1px solid rgba(244, 121, 32, 0.4);
      color: #fb923c;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 14px;
      border-radius: 9999px;
    }
    .cover-body { margin: auto 0; max-width: 85%; }
    .cover-category { color: #F47920; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .cover-title { font-size: 38px; font-weight: 800; line-height: 1.15; margin: 0 0 16px 0; color: #ffffff; }
    .cover-recipient {
      background: rgba(255, 255, 255, 0.05);
      ${isHe ? "border-right: 4px solid #F47920; border-radius: 10px 0 0 10px;" : "border-left: 4px solid #F47920; border-radius: 0 10px 10px 0;"}
      padding: 14px 18px;
      margin-top: 16px;
    }
    .recipient-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 1px; margin-bottom: 2px; }
    .recipient-name { font-size: 18px; font-weight: 700; color: #ffffff; }
    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 14px;
      font-size: 12px;
      color: #94a3b8;
    }
    .cover-host { font-weight: 600; color: #f8fafc; }

    /* Standard Header & Footer */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #F47920;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-brand { font-size: 14px; font-weight: 800; color: #0F172A; }
    .header-brand span { color: #F47920; }
    .header-meta { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 10px;
      color: #94a3b8;
    }

    /* Matrix Table Slide */
    .matrix-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
    .matrix-subtitle { font-size: 12px; color: #64748b; margin: 0 0 14px 0; }
    table.matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
    }
    table.matrix-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: ${isHe ? "right" : "left"};
      padding: 9px 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.matrix-table td {
      padding: 10px 10px;
      text-align: ${isHe ? "right" : "left"};
      border-bottom: 1px solid #e2e8f0;
    }
    table.matrix-table tr:nth-child(even) { background: #f8fafc; }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .badge-cert { background: #e0f2fe; color: #0369a1; }
    .badge-kosher { background: #fef3c7; color: #b45309; }

    /* Factory Slide Layout */
    .factory-layout {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 20px;
      flex: 1;
      min-height: 0;
      margin: 10px 0;
    }
    .factory-details { display: flex; flex-direction: column; justify-content: space-between; }
    .country-pill {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #F47920;
    }
    .factory-name { font-size: 24px; font-weight: 800; color: #0f172a; margin: 2px 0; }
    .factory-product { font-size: 14px; font-weight: 600; color: #475569; margin: 0 0 12px 0; }
    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .spec-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .spec-label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 2px; }
    .spec-val { font-size: 13px; font-weight: 700; color: #0f172a; }
    .text-green { color: #16a34a !important; }
    .text-orange { color: #ea580c !important; }
    .compliance-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
      margin-bottom: 10px;
    }
    .compliance-row { margin-bottom: 4px; }
    .compliance-row:last-child { margin-bottom: 0; }
    .comp-label { font-weight: 700; color: #78350f; }
    .pill-cert {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .tech-specs { font-size: 11px; color: #334155; }
    .tech-title { font-weight: 700; color: #0f172a; margin-bottom: 4px; display: block; }
    .tech-list { margin: 0; padding-${isHe ? "right" : "left"}: 16px; }
    .tech-list li { margin-bottom: 2px; }

    /* Factory Visual Column */
    .factory-visual {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      text-align: center;
    }
    .factory-img {
      max-height: 250px;
      max-width: 100%;
      object-fit: contain;
      border-radius: 8px;
      margin: auto;
    }
    .placeholder-img {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 240px;
      background: #f1f5f9;
      border-radius: 8px;
    }
    .sample-callout {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 10px;
    }

    /* Back Cover */
    .back-cover {
      background: #0f172a;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .back-logo { font-size: 40px; font-weight: 900; margin-bottom: 8px; }
    .back-logo span { color: #F47920; }
    .back-tagline { font-size: 14px; color: #94a3b8; font-weight: 500; margin-bottom: 24px; }
    .qr-box {
      background: #ffffff;
      padding: 12px;
      border-radius: 16px;
      display: inline-block;
      margin-bottom: 16px;
    }
    .qr-img { width: 140px; height: 140px; display: block; }
    .back-contact { font-size: 13px; line-height: 1.6; color: #cbd5e1; }
    .back-contact strong { color: #ffffff; }
  </style>
</head>
<body>

<div class="print-controls">
  <button class="btn-action" onclick="window.print()">${isHe ? "🖨️ שמור כקובץ PDF / הדפסה" : "Save as PDF"}</button>
  <button class="btn-close" onclick="window.close()">${isHe ? "✕ סגור" : "Close"}</button>
</div>

<!-- Slide 1: Cover Page -->
<div class="page cover-page">
  <div class="cover-top">
    <div class="logo">Food<span>X</span>change</div>
    <div class="tagline-pill">${isHe ? "מצגת בחירת מפעלים מאירופה · סודי ומסחרי" : "Commercial Deal Deck"}</div>
  </div>

  <div class="cover-body">
    <div class="cover-category">${escapeHtml(category)}</div>
    <h1 class="cover-title">${escapeHtml(title)}</h1>
    
    <div class="cover-recipient">
      <div class="recipient-label">${isHe ? "הוכן באופן בלעדי עבור:" : "Prepared Exclusively For"}</div>
      <div class="recipient-name">${escapeHtml(buyerCompany)} &middot; ${isHe ? "לידי:" : "Attn:"} ${escapeHtml(buyerName)}</div>
    </div>

    ${note ? `<p style="font-size:13px; color:#cbd5e1; margin-top:14px; line-height:1.5;">"${escapeHtml(note)}"</p>` : ""}
  </div>

  <div class="cover-footer">
    <div>
      <span class="cover-host">${isHe ? "אודי סטריק" : "Udi Stryk"}</span> &middot; ${isHe ? "מייסד ומנהל מסחרי, FoodXchange" : "Founder &amp; Operator, FoodXchange"}<br>
      <span style="font-size:11px;">${isHe ? "תל אביב, ישראל &middot; udi@fdx.trading &middot; 052-522-2291" : "Tel Aviv, Israel &middot; udi@fdx.trading &middot; +972-52-522-2291"}</span>
    </div>
    <div style="text-align:${isHe ? "left" : "right"};">
      <span>${isHe ? "סודי ביותר ומסחרי" : "Strictly Confidential"}</span> &middot; 
      <span>${isHe ? new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
    </div>
  </div>
</div>

<!-- Slide 2: Commercial Matrix -->
<div class="page">
  <div class="header">
    <div class="header-brand">${isHe ? "Food<span>X</span>change &middot; טבלת השוואה מסחרית" : "Food<span>X</span>change &middot; Assortment Selection Matrix"}</div>
    <div class="header-meta">${isHe ? `${escapeHtml(category)} &middot; בנצ'מרק CIF חיפה ואשדוד` : `${escapeHtml(category)} &middot; CIF Haifa &amp; Ashdod Benchmark`}</div>
  </div>

  <div style="flex:1;">
    <h2 class="matrix-title">${isHe ? "סקירה השוואתית של מפעלי הייצור באירופה" : "Candidate European Manufacturers Overview"}</h2>
    <p class="matrix-subtitle">${isHe ? "הערכה השוואתית של מפעלי מזון מאומתים, תקני בטיחות בינלאומיים (BRC/IFS), כשרות ומחירי CIF לישראל." : "Comparative assessment of verified production facilities, international safety certifications, kosher oversight, and preliminary CIF terms."}</p>

    <table class="matrix-table">
      <thead>
        <tr>
          <th>${isHe ? "מפעל / יצרן" : "Factory / Plant"}</th>
          <th>${isHe ? "מקור" : "Origin"}</th>
          <th>${isHe ? "מוצר / תצורה" : "Product / Format"}</th>
          <th>${isHe ? "אריזה" : "Packaging"}</th>
          <th>${isHe ? "תקנים" : "Standards"}</th>
          <th>${isHe ? "נתיב כשרות" : "Kosher Feasibility"}</th>
          <th>${isHe ? "מחיר יעד CIF חיפה" : "Target CIF Haifa"}</th>
          <th>${isHe ? "כמות מינימום" : "MOQ"}</th>
        </tr>
      </thead>
      <tbody>
        ${matrixRows}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>${isHe ? `FoodXchange &middot; fdx.trading &middot; הוכן עבור ${escapeHtml(buyerCompany)}` : `FoodXchange &middot; fdx.trading &middot; Prepared for ${escapeHtml(buyerCompany)}`}</span>
    <span>${isHe ? "עמוד 2 &middot; השוואה מסחרית" : "Page 2 &middot; Commercial Comparison"}</span>
  </div>
</div>

<!-- Slides 3+: Individual Factory Slides -->
${factorySlides}

<!-- Final Slide: Back Cover & Contact -->
<div class="page back-cover">
  <div class="back-logo">Food<span>X</span>change</div>
  <div class="back-tagline">${isHe ? "מחברים יצרני מזון אירופאיים מאומתים עם רשתות השיווק בישראל" : "Connecting Verified European Manufacturers with Israeli Retailers"}</div>

  <div class="qr-box">
    <img
      src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://fdx.trading/business-card/udi"
      alt="Udi Stryk Contact QR Code"
      class="qr-img"
    />
  </div>

  <div class="back-contact">
    <strong>${isHe ? "אודי סטריק &middot; מייסד ומנהל פעילות" : "Udi Stryk &middot; Founder &amp; Operator"}</strong><br>
    ${isHe ? "ישיר" : "Direct"}: <a href="tel:+972525222291" style="color:#F47920; text-decoration:none;">052-522-2291</a><br>
    ${isHe ? "אימייל" : "Email"}: <a href="mailto:udi@fdx.trading" style="color:#F47920; text-decoration:none;">udi@fdx.trading</a><br>
    ${isHe ? "כרטיס ביקור" : "Portal"}: <span style="color:#94a3b8;">fdx.trading/business-card/udi</span>
  </div>

  <div style="margin-top:20px; font-size:11px; color:#64748b;">
    ${isHe ? "שלבים הבאים: הזמנת ערכת דוגמאות ב-DHL &middot; תיאום שיחת וידאו מקצועית (15 דקות)" : "Next Steps: Request DHL Tasting Samples &middot; Schedule 15-Min Sourcing Video Call"}
  </div>
</div>

</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
