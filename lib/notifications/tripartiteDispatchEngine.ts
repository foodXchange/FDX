import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type TripartiteEventType =
  | "po_signed_advance_due"
  | "advance_verified_production_released"
  | "container_loaded_vessel_departed"
  | "vessel_approaching_customs_dispatch"
  | "customs_cleared_inland_trucking"
  | "grn_dock_accepted_deal_closed";

export interface TripartiteEventPayload {
  requestId: string;
  eventType: TripartiteEventType;
  poNumber: string;
  buyerCompany: string;
  buyerContact?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  supplierName: string;
  supplierCountry: string;
  supplierEmail?: string;
  supplierPhone?: string;
  productName: string;
  orderVolume: string;
  totalOrderValueEur?: number;
  advance30Eur?: number;
  balance70Eur?: number;
  containerNumber?: string;
  billOfLading?: string;
  vesselName?: string;
  shippingLine?: string;
  etaPort?: string;
  customsDeclarationNumber?: string;
  warehousePalletCount?: number;
  receivingOfficer?: string;
  grnNumber?: string;
}

export interface TripartiteNotificationLog {
  id: string;
  eventType: TripartiteEventType;
  recipientRole: "buyer" | "factory" | "customs";
  recipientName: string;
  recipientContact: string;
  channel: "whatsapp" | "email" | "both";
  status: "dispatched" | "delivered" | "queued";
  timestamp: string;
  previewText: string;
  actionUrl?: string;
}

export interface FormattedTripartiteMessage {
  recipientRole: "buyer" | "factory" | "customs";
  recipientName: string;
  recipientContact: string;
  subject: string;
  whatsappText: string;
  whatsappUrl: string;
  emailHtml: string;
  portalUrl: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodxchange.com";

export function buildWhatsAppUrl(phone: string | undefined, text: string): string {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatTripartiteMessage(payload: TripartiteEventPayload): FormattedTripartiteMessage {
  const buyerPortalUrl = `${BASE_URL}/track/${payload.requestId}`;
  const customsPortalUrl = `${BASE_URL}/customs/${payload.requestId}`;
  const supplierPortalUrl = `${BASE_URL}/supplier-match/${payload.requestId}`;

  const po = payload.poNumber || `FDX-PO-${payload.requestId.slice(0, 6).toUpperCase()}`;
  const cont = payload.containerNumber || "MSKU-9481029";
  const bl = payload.billOfLading || "MSCUVAL881920";
  const vessel = payload.vesselName || "MSC LEANNE / Voyage 2604E";
  const line = payload.shippingLine || "MSC";
  const eta = payload.etaPort || "Pending Port Berth";
  const totalEur = payload.totalOrderValueEur ? `€${payload.totalOrderValueEur.toLocaleString()}` : "€44,400";
  const advEur = payload.advance30Eur ? `€${payload.advance30Eur.toLocaleString()}` : "€13,320";

  switch (payload.eventType) {
    case "po_signed_advance_due": {
      const recipientName = payload.buyerContact || payload.buyerCompany;
      const text = `שלום ${recipientName},\nהזמנת רכש מסחרית #${po} עבור ${payload.productName} (${payload.orderVolume}) נחתמה בהצלחה (שווי חוזה: ${totalEur}).\nלהפעלת קו הייצור במפעל באירופה, נא להסדיר את מקדמת ה-30% (${advEur}) ולהעלות אסמכתת העברה בנקאית בקישור המאובטח הבא:\n${buyerPortalUrl}`;
      return {
        recipientRole: "buyer",
        recipientName,
        recipientContact: payload.buyerPhone || payload.buyerEmail || "Buyer Procurement Desk",
        subject: `[FoodXchange] הזמנת רכש #${po} נחתמה בהצלחה - נדרשת הסדרת מקדמת 30% להפעלת הייצור`,
        whatsappText: text,
        whatsappUrl: buildWhatsAppUrl(payload.buyerPhone, text),
        portalUrl: buyerPortalUrl,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;" dir="rtl">
            <h2 style="color:#0f172a;margin-top:0;">הזמנת רכש מסחרית #${po} נחתמה בהצלחה</h2>
            <p>שלום <strong>${recipientName}</strong>,</p>
            <p>הזמנת הרכש עבור <strong>${payload.productName}</strong> (${payload.orderVolume}) נחתמה ואושרה במערכת FoodXchange.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>שווי חוזה כולל:</strong> ${totalEur}</p>
              <p style="margin:4px 0;"><strong>סכום מקדמת 30% לתשלום:</strong> <span style="color:#16a34a;font-weight:bold;">${advEur}</span></p>
              <p style="margin:4px 0;"><strong>יצרן מספק:</strong> ${payload.supplierName} (${payload.supplierCountry})</p>
            </div>
            <p>להפעלת קו הייצור במפעל, נא להסדיר את ההעברה הבנקאית לחשבון הנאמנות ולהעלות את אסמכתאת ה-SWIFT בפורטל:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${buyerPortalUrl}" style="background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">כניסה לפורטל והעלאת אסמכתא &larr;</a>
            </div>
          </div>
        `,
      };
    }

    case "advance_verified_production_released": {
      const recipientName = `${payload.supplierName} Export & QA Team`;
      const text = `Hello ${payload.supplierName} Export Team,\nFoodXchange confirms that the 30% advance production deposit (${advEur}) for Commercial PO #${po} (${payload.productName}, ${payload.orderVolume}) has been verified and remitted.\nYou are fully authorized to proceed with factory raw material procurement, bottling, and QA lot allocation.\nPlease update batch milestones here:\n${supplierPortalUrl}`;
      return {
        recipientRole: "factory",
        recipientName,
        recipientContact: payload.supplierEmail || payload.supplierPhone || "Export Sales Director",
        subject: `[FoodXchange] Advance 30% Confirmed - Production Authorized for PO #${po} (${payload.productName})`,
        whatsappText: text,
        whatsappUrl: buildWhatsAppUrl(payload.supplierPhone, text),
        portalUrl: supplierPortalUrl,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;" dir="ltr">
            <h2 style="color:#0f172a;margin-top:0;">Production Run Authorized · PO #${po}</h2>
            <p>Dear <strong>${payload.supplierName} Export Team</strong>,</p>
            <p>We are pleased to confirm that the 30% advance wire deposit (<strong>${advEur}</strong>) from <strong>${payload.buyerCompany}</strong> has been cleared.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>Product:</strong> ${payload.productName}</p>
              <p style="margin:4px 0;"><strong>Quantity:</strong> ${payload.orderVolume}</p>
              <p style="margin:4px 0;"><strong>Advance Wire:</strong> <span style="color:#16a34a;font-weight:bold;">${advEur} Cleared</span></p>
            </div>
            <p>Please initiate bottling, print Hebrew private label cartons, and track production milestones via your multilingual portal:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${supplierPortalUrl}" style="background:#0284c7;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Open Supplier Production Desk &rarr;</a>
            </div>
          </div>
        `,
      };
    }

    case "container_loaded_vessel_departed": {
      const recipientName = payload.buyerContact || payload.buyerCompany;
      const text = `שלום ${recipientName},\nמכולה ${cont} הועמסה על גבי אוניית ${vessel} (${line}) ויצאה מנמל המוצא בדרכה לנמל אשדוד (צפי עגינה משוער: ${eta}).\nשטר מטען ימי #${bl}.\nמעקב לווייני AIS חי ורציפות קירור זמינים לצפייה בפורטל:\n${buyerPortalUrl}`;
      return {
        recipientRole: "buyer",
        recipientName,
        recipientContact: payload.buyerPhone || payload.buyerEmail || "Buyer Logistics Team",
        subject: `[FoodXchange] מכולה ${cont} הועמסה על אוניית ${vessel} ויצאה לדרכה לנמל אשדוד`,
        whatsappText: text,
        whatsappUrl: buildWhatsAppUrl(payload.buyerPhone, text),
        portalUrl: buyerPortalUrl,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;" dir="rtl">
            <h2 style="color:#0f172a;margin-top:0;">מכולה ${cont} יצאה לדרכה לנמל אשדוד</h2>
            <p>שלום <strong>${recipientName}</strong>,</p>
            <p>ההזמנה שלכם (<strong>${payload.productName}</strong>) סיימה ייצור, הועמסה למכולה ימית ויצאה לדרך בים התיכון.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>מספר מכולה:</strong> <span style="font-family:monospace;font-weight:bold;color:#0284c7;">${cont}</span></p>
              <p style="margin:4px 0;"><strong>שטר מטען ימי:</strong> <span style="font-family:monospace;">${bl}</span></p>
              <p style="margin:4px 0;"><strong>אונייה וקו ספנות:</strong> ${vessel} (${line})</p>
              <p style="margin:4px 0;"><strong>צפי עגינה באשדוד (ETA):</strong> <strong style="color:#d97706;">${eta}</strong></p>
            </div>
            <p>ניתן לצפות בנתיב הימי החי, חיישני הטמפרטורה ונתוני ה-AIS במפה האינטראקטיבית:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${buyerPortalUrl}" style="background:#0284c7;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">מעקב ימי חי בפורטל &larr;</a>
            </div>
          </div>
        `,
      };
    }

    case "vessel_approaching_customs_dispatch": {
      const recipientName = "עמיל המכס המורשה (Customs Clearing Agent)";
      const text = `שלום לעמיל המכס בנמל אשדוד,\nמכולה ${cont} (${line} / ${vessel}) מתקרבת לנמל אשדוד (צפי עגינה: ${eta}).\nיבואן רשמי: ${payload.buyerCompany}.\nתיק שחרור מכס מלא (שטר מטען 3/3 מקורי, חשבונית, פקליסט, תעודת מקור EUR.1 פטור 0%, כשרות ובדיקות בריאות המזון) מוכן להגשה ישירה לשער עולמי בקישור הבא:\n${customsPortalUrl}`;
      return {
        recipientRole: "customs",
        recipientName,
        recipientContact: "Ashdod Port Customs Desk",
        subject: `[שער עולמי] תיק שחרור מכס מוכן למכולה ${cont} עבור ${payload.buyerCompany} (נמל אשדוד)`,
        whatsappText: text,
        whatsappUrl: buildWhatsAppUrl(undefined, text),
        portalUrl: customsPortalUrl,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;" dir="rtl">
            <h2 style="color:#0f172a;margin-top:0;">תיק שחרור מכס מכולה ${cont} (נמל אשדוד)</h2>
            <p>שלום <strong>לצוות עמילות המכס</strong>,</p>
            <p>מצורף תיק היבוא והמסמכים המקוריים להגשת הצהרת יבוא במערכת שער עולמי עבור <strong>${payload.buyerCompany}</strong>.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>מספר מכולה:</strong> <span style="font-family:monospace;font-weight:bold;">${cont}</span></p>
              <p style="margin:4px 0;"><strong>שטר מטען:</strong> <span style="font-family:monospace;">${bl}</span></p>
              <p style="margin:4px 0;"><strong>אונייה ורציף:</strong> ${vessel} · נמל אשדוד רציף 21</p>
              <p style="margin:4px 0;"><strong>חבילת 6 מסמכים:</strong> Clean B/L 3/3, חשבונית ספק, רשימת אריזה, EUR.1 (פטור 0%), אישור כשרות הרבנות, תעודת בריאות שירות המזון.</p>
            </div>
            <p>לצפייה בתיק המסמכים המלא ולרישום רשימון השחרור:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${customsPortalUrl}" style="background:#1d4ed8;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">כניסה לפורטל עמיל המכס &larr;</a>
            </div>
          </div>
        `,
      };
    }

    case "customs_cleared_inland_trucking": {
      const dec = payload.customsDeclarationNumber || `IL-2604-${payload.requestId.slice(0, 5).toUpperCase()}`;
      const recipientName = `מרלוג ולוגיסטיקה ${payload.buyerCompany}`;
      const text = `שלום לצוות המרלוג של ${payload.buyerCompany},\nמכולה ${cont} שוחררה בהצלחה ממכס נמל אשדוד במסלול ירוק (רשימון יבוא #${dec})!\nפקודת מסירה הונפקה והמכולה הועברה להובלה יבשתית ישירה למחסן שלכם לקליטה ופריקה.\nפרטים ואישור תעודת קבלה (GRN) בפורטל:\n${buyerPortalUrl}`;
      return {
        recipientRole: "buyer",
        recipientName,
        recipientContact: payload.buyerPhone || payload.buyerEmail || "Distribution Center Hub",
        subject: `[מכס ישראל] מכולה ${cont} שוחררה במסלול ירוק (רשימון #${dec}) - בדרך למרלוג`,
        whatsappText: text,
        whatsappUrl: buildWhatsAppUrl(payload.buyerPhone, text),
        portalUrl: buyerPortalUrl,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;" dir="rtl">
            <h2 style="color:#16a34a;margin-top:0;">המכולה שוחררה ממכס נמל אשדוד במסלול ירוק ✓</h2>
            <p>שלום <strong>לצוות הלוגיסטיקה והמרלוג</strong>,</p>
            <p>אנו מעדכנים כי מכולה <strong>${cont}</strong> שוחררה בהצלחה ע״י עמיל המכס ונמצאת בהובלה יבשתית לכיוון המחסן המרכזי שלכם.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>מספר רשימון מכס:</strong> <span style="font-family:monospace;font-weight:bold;color:#15803d;">${dec}</span></p>
              <p style="margin:4px 0;"><strong>מטען:</strong> ${payload.productName} (${payload.orderVolume})</p>
              <p style="margin:4px 0;"><strong>סטטוס שחרור:</strong> הותר לשחרור סופי (מסלול ירוק שער עולמי)</p>
            </div>
            <p>נא להיערך לפריקה ברציף קבלה ולחתימה על תעודת קבלת הטובין (GRN) בפורטל עם הגעת המוביל:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${buyerPortalUrl}" style="background:#15803d;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">אישור קליטת משטחים בפורטל &larr;</a>
            </div>
          </div>
        `,
      };
    }

    case "grn_dock_accepted_deal_closed": {
      const grn = payload.grnNumber || `GRN-IL-2604-${payload.requestId.slice(0, 5).toUpperCase()}`;
      const pallets = payload.warehousePalletCount || 24;
      const recipientName = payload.buyerCompany;
      const text = `הודעת סגירת עסקה FoodXchange:\nכל ${pallets} המשטחים של הזמנה #${po} (${payload.productName}) נפרקו ונחתמו רשמית במרלוג (תעודת קבלה רשמית ${grn}).\nהסחורה נקלטה במלאי ה-ERP של היבואן והעסקה סווגה כהושלמה במלואה בהצלחה 🏆.\nתעודת קבלה (GRN PDF) זמינה כאן:\n${buyerPortalUrl}`;
      return {
        recipientRole: "buyer",
        recipientName,
        recipientContact: payload.buyerContact || payload.buyerCompany,
        subject: `[FoodXchange] תעודת קבלת טובין רשמית (${grn}) - עסקת ${payload.productName} הושלמה במלואה!`,
        whatsappText: text,
        whatsappUrl: buildWhatsAppUrl(payload.buyerPhone, text),
        portalUrl: buyerPortalUrl,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;" dir="rtl">
            <h2 style="color:#0f172a;margin-top:0;">תעודת קבלה רשמית (${grn}) · העסקה הושלמה 🏆</h2>
            <p>שלום <strong>${recipientName}</strong>,</p>
            <p>אנו מודים לכם על שיתוף הפעולה המוצלח! כל ${pallets} המשטחים נקלטו במלואם במרלוג ונחתמו רשמית בתעודת קבלה (Goods Receipt Note).</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>מספר תעודת קבלה:</strong> <span style="font-family:monospace;font-weight:bold;color:#0f172a;">${grn}</span></p>
              <p style="margin:4px 0;"><strong>מוצר והיקף:</strong> ${payload.productName} (${payload.orderVolume})</p>
              <p style="margin:4px 0;"><strong>קצין קבלה חתום:</strong> ${payload.receivingOfficer || "מנהל מרלוג"}</p>
              <p style="margin:4px 0;"><strong>סטטוס עסקה:</strong> הושלמה בהצלחה (100% Delivered & Settled)</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${buyerPortalUrl}" style="background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">הורדת תעודת קבלה רשמית (PDF) &larr;</a>
            </div>
          </div>
        `,
      };
    }
  }
}

/** Dispatches a tripartite notification event and persists audit log to database */
export async function dispatchTripartiteEvent(
  payload: TripartiteEventPayload,
  channel: "whatsapp" | "email" | "both" = "both"
): Promise<{ ok: true; logId: string; whatsappUrl: string; message: string } | { ok: false; error: string; message: string }> {
  try {
    const formatted = formatTripartiteMessage(payload);
    const logId = `LOG-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    let emailSent = false;
    if (channel === "email" || channel === "both") {
      if (process.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const from = process.env.RESEND_FROM_EMAIL ?? "FoodXchange Notifications <info@foodz-x.com>";
          const targetEmail =
            formatted.recipientRole === "factory"
              ? payload.supplierEmail || "factory@producer.eu"
              : payload.buyerEmail || "procurement@retailer.co.il";

          await resend.emails.send({
            from,
            to: targetEmail,
            subject: formatted.subject,
            html: formatted.emailHtml,
          });
          emailSent = true;
        } catch (mailErr) {
          console.warn("Resend email dispatch warning:", mailErr);
        }
      }
    }

    // Persist log entry into sourcing_requests.ai_analysis.tripartite_notification_logs
    const { data: req } = await supabaseAdmin
      .from("sourcing_requests")
      .select("ai_analysis")
      .eq("id", payload.requestId)
      .maybeSingle();

    if (req) {
      const existingAi = (req.ai_analysis as Record<string, unknown> | null) ?? {};
      const existingLogs = (existingAi.tripartite_notification_logs as TripartiteNotificationLog[] | null) ?? [];

      const newLog: TripartiteNotificationLog = {
        id: logId,
        eventType: payload.eventType,
        recipientRole: formatted.recipientRole,
        recipientName: formatted.recipientName,
        recipientContact: formatted.recipientContact,
        channel,
        status: emailSent ? "delivered" : "dispatched",
        timestamp: now,
        previewText: formatted.whatsappText.slice(0, 140) + "...",
        actionUrl: formatted.portalUrl,
      };

      await supabaseAdmin
        .from("sourcing_requests")
        .update({
          ai_analysis: {
            ...existingAi,
            tripartite_notification_logs: [newLog, ...existingLogs].slice(0, 50),
          },
        })
        .eq("id", payload.requestId);
    }

    return {
      ok: true,
      logId,
      whatsappUrl: formatted.whatsappUrl,
      message: `Notification dispatched successfully to ${formatted.recipientName} (${formatted.recipientRole})`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Failed to dispatch tripartite event: ${msg}`,
      message: `Failed to dispatch tripartite event: ${msg}`,
    };
  }
}
