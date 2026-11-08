import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSupplierEmailSmart } from "@/lib/email/gmailEngine";
import { createNotification } from "@/lib/notifications/createNotification";
import { revalidatePath } from "next/cache";

const NATIVE_BANNERS: Record<string, (company: string, product: string) => string> = {
  spain: (c, p) =>
    `🇪🇸 [Nota en Español]: Estimado equipo de exportación de ${c}, FoodXchange gestiona actualmente una compra activa de "${p}" para distribución minorista en Israel. Le invitamos cordialmente a revisar los detalles en inglés a continuación y enviarnos su catálogo / cotización preliminar.`,
  mexico: (c, p) =>
    `🇲🇽 [Nota en Español]: Estimado equipo de exportación de ${c}, FoodXchange gestiona una compra activa de "${p}". Le invitamos a revisar los detalles a continuación y enviarnos su cotización.`,
  argentina: (c, p) =>
    `🇦🇷 [Nota en Español]: Estimado equipo de exportación de ${c}, FoodXchange gestiona una compra activa de "${p}". Le invitamos a revisar los detalles a continuación y enviarnos su cotización.`,
  italy: (c, p) =>
    `🇮🇹 [Nota in Italiano]: Gentile Team Export di ${c}, FoodXchange sta gestendo una richiesta di acquisto attiva per "${p}" destinata alla distribuzione retail in Israele. Vi invitiamo a visionare i dettagli qui sotto e a inviarci il vostro catalogo / quotazione preliminare.`,
  germany: (c, p) =>
    `🇩🇪 [Hinweis auf Deutsch]: Sehr geehrtes Export-Team von ${c}, FoodXchange betreut derzeit eine aktive Beschaffungsanfrage für "${p}" für den Einzelhandel in Israel. Bitte prüfen Sie die nachfolgenden Details und senden Sie uns Ihr vorläufiges Angebot.`,
  austria: (c, p) =>
    `🇦🇹 [Hinweis auf Deutsch]: Sehr geehrtes Export-Team von ${c}, FoodXchange betreut derzeit eine aktive Beschaffungsanfrage für "${p}". Bitte prüfen Sie die nachfolgenden Details.`,
  switzerland: (c, p) =>
    `🇨🇭 [Hinweis auf Deutsch]: Sehr geehrtes Export-Team von ${c}, FoodXchange betreut derzeit eine aktive Beschaffungsanfrage für "${p}". Bitte prüfen Sie die nachfolgenden Details.`,
  france: (c, p) =>
    `🇫🇷 [Note en Français]: Cher service Export de ${c}, FoodXchange gère actuellement une demande d'approvisionnement active pour "${p}" destinée à la grande distribution en Israël. Merci de consulter les détails ci-dessous et de nous transmettre votre offre préliminaire.`,
  belgium: (c, p) =>
    `🇧🇪 [Note en Français]: Cher service Export de ${c}, FoodXchange gère actuellement une demande d'approvisionnement active pour "${p}". Merci de consulter les détails ci-dessous.`,
  greece: (c, p) =>
    `🇬🇷 [Σημείωση στα Ελληνικά]: Αγαπητή ομάδα εξαγωγών της ${c}, η FoodXchange διαχειρίζεται ενεργή ζήτηση για "${p}" για την αγορά του Ισραήλ. Παρακαλούμε δείτε τις λεπτομέρειες παρακάτω και στείλτε μας τον κατάλογο / προσφορά σας.`,
  poland: (c, p) =>
    `🇵🇱 [Informacja po polsku]: Szanowny Dziale Eksportu ${c}, FoodXchange prowadzi aktywne zapytanie ofertowe dotyczące "${p}" dla sieci detalicznych w Izraelu. Zapraszamy do zapoznania się ze szczegółami poniżej i przesłania wstępnej oferty.`,
};

function buildNativeLanguageBanner(
  country: string | null | undefined,
  companyName: string,
  productName: string
): string {
  if (!country) return "";
  const norm = country.trim().toLowerCase();
  for (const [key, builder] of Object.entries(NATIVE_BANNERS)) {
    if (norm.includes(key)) {
      return `${builder(companyName, productName)}\n------------------------------------------------------------\n\n`;
    }
  }
  return "";
}

/**
 * POST /api/admin/outreach/new-supplier
 * Adds a brand-new supplier (or updates existing), links it to a sourcing request (`sourcing_matches`),
 * and optionally dispatches the initial cooperation email right away.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "Europe";
    const website = typeof body.website === "string" ? body.website.trim() : "";
    const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const productNameInput = typeof body.productName === "string" ? body.productName.trim() : "";
    const sendImmediately = body.sendImmediately !== false;
    const nativeLanguagePrefix = Boolean(body.nativeLanguagePrefix);

    if (!requestId || !companyName || !contactEmail) {
      return NextResponse.json(
        { error: "requestId, companyName, and contactEmail are required" },
        { status: 400 }
      );
    }

    // 1. Fetch the target Sourcing Request
    const { data: sReq, error: reqErr } = await supabaseAdmin
      .from("sourcing_requests")
      .select("id, product_name, company, category, certifications, volume_per_year")
      .eq("id", requestId)
      .single();

    if (reqErr || !sReq) {
      return NextResponse.json(
        { error: reqErr?.message || "Sourcing request not found" },
        { status: 404 }
      );
    }

    const effectiveProductName = productNameInput || sReq.product_name || "Food & Beverage Products";

    // 2. Find or create the supplier in supplier_offerings
    let supplierId: string | null = null;
    const { data: existingSupp } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id, contact_email, website")
      .ilike("company_name", companyName)
      .limit(1)
      .maybeSingle();

    if (existingSupp?.id) {
      supplierId = existingSupp.id;
      const updates: Record<string, any> = {};
      if (contactEmail && contactEmail !== existingSupp.contact_email) {
        updates.contact_email = contactEmail;
      }
      if (website && website !== existingSupp.website) {
        updates.website = website;
      }
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("supplier_offerings").update(updates).eq("id", supplierId);
      }
    } else {
      const { data: insertedSupp, error: insErr } = await supabaseAdmin
        .from("supplier_offerings")
        .insert({
          company_name: companyName,
          product_name: effectiveProductName,
          category: sReq.category || "Grocery & Packaged Goods",
          country_of_origin: country || "Europe",
          website: website || null,
          contact_email: contactEmail,
          status: "approved",
          certifications: Array.isArray(sReq.certifications) ? sReq.certifications : [],
        })
        .select("id")
        .single();

      if (insErr || !insertedSupp) {
        return NextResponse.json(
          { error: insErr?.message || "Failed to create supplier record" },
          { status: 500 }
        );
      }
      supplierId = insertedSupp.id;
    }

    // Also ensure supplier_contacts has the email
    if (supplierId && contactEmail) {
      const { data: existingContact } = await supabaseAdmin
        .from("supplier_contacts")
        .select("id")
        .eq("supplier_id", supplierId)
        .ilike("email", contactEmail)
        .maybeSingle();

      if (!existingContact) {
        await supabaseAdmin.from("supplier_contacts").insert({
          supplier_id: supplierId,
          email: contactEmail.toLowerCase(),
          name: `${companyName} Export Desk`,
          role: "Export Sales",
        });
      }
    }

    // 3. Create or retrieve sourcing_matches row
    let matchId: string | null = null;
    let existingBreakdown: Record<string, any> = {};

    const { data: existingMatch } = await supabaseAdmin
      .from("sourcing_matches")
      .select("id, match_breakdown")
      .eq("request_id", requestId)
      .eq("supplier_id", supplierId)
      .maybeSingle();

    if (existingMatch?.id) {
      matchId = existingMatch.id;
      existingBreakdown = (existingMatch.match_breakdown as Record<string, any>) || {};
    } else {
      const { data: createdMatch, error: matchErr } = await supabaseAdmin
        .from("sourcing_matches")
        .insert({
          request_id: requestId,
          supplier_id: supplierId,
          company_name: companyName,
          product_name: effectiveProductName,
          country: country || "Europe",
          match_score: 88,
          status: sendImmediately ? "rfq_sent" : "approved",
          approved_at: new Date().toISOString(),
          match_breakdown: {
            source: "manual_admin_outreach",
            website: website || null,
            contact_email: contactEmail,
          },
        })
        .select("id, match_breakdown")
        .single();

      if (matchErr || !createdMatch) {
        return NextResponse.json(
          { error: matchErr?.message || "Failed to create sourcing match" },
          { status: 500 }
        );
      }
      matchId = createdMatch.id;
      existingBreakdown = (createdMatch.match_breakdown as Record<string, any>) || {};
    }

    // 4. If sendImmediately is true, send the email now
    let deliveryProvider: string | null = null;
    let emailError: string | null = null;

    if (sendImmediately && matchId) {
      const shortReqId = requestId.slice(0, 8).toUpperCase();
      const shortMatchId = matchId.slice(0, 8).toUpperCase();
      const rawSubject =
        typeof body.subject === "string" && body.subject.trim()
          ? body.subject.trim()
          : `[FDX-REQ-${shortReqId}] Initial Supplier Inquiry & Catalog Request: ${effectiveProductName} — FoodXchange`;

      const personalizedSubject = rawSubject.includes(companyName)
        ? rawSubject
        : `${rawSubject} (${companyName})`;

      const baseBody =
        typeof body.body === "string" && body.body.trim()
          ? body.body.trim().replace(/\{\{Supplier_Name\}\}/gi, companyName)
          : `Dear Export & Commercial Team at ${companyName},\n\nFoodXchange (FDX) is managing an active B2B sourcing requirement [FDX-REQ-${shortReqId}] for "${effectiveProductName}" for retail distribution in Israel.\n\nCould you please confirm if this product line is available for export and share your product catalog, pack sizes, MOQ, and preliminary FOB/CIF pricing?\n\nBest regards,\nUdi — FoodXchange Sourcing Desk`;

      const banner = nativeLanguagePrefix
        ? buildNativeLanguageBanner(country, companyName, effectiveProductName)
        : "";
      const personalizedBody = `${banner}${baseBody}`;

      const emailResult = await sendSupplierEmailSmart({
        to: contactEmail,
        subject: personalizedSubject,
        bodyText: personalizedBody,
        matchId,
        requestId,
      });

      if (emailResult.success) {
        deliveryProvider = emailResult.via || "gmail";
        const sentAtIso = new Date().toISOString();
        const existingHistory = Array.isArray(existingBreakdown.outreach_history)
          ? existingBreakdown.outreach_history
          : [];

        const newEntry = {
          id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          direction: "outbound",
          to: contactEmail,
          subject: emailResult.subjectUsed || personalizedSubject,
          body: personalizedBody,
          provider: deliveryProvider,
          message_id: emailResult.messageId || null,
          is_follow_up: false,
          created_at: sentAtIso,
        };

        await supabaseAdmin
          .from("sourcing_matches")
          .update({
            status: "rfq_sent",
            rfq_sent_at: sentAtIso,
            sent_at: sentAtIso,
            sent_via: "email",
            rfq_deadline: body.deadline || null,
            match_breakdown: {
              ...existingBreakdown,
              website: website || existingBreakdown.website || null,
              contact_email: contactEmail,
              last_outreach_subject: emailResult.subjectUsed || personalizedSubject,
              last_outreach_body: personalizedBody,
              last_outreach_to: contactEmail,
              last_outreach_provider: deliveryProvider,
              last_outreach_at: sentAtIso,
              outreach_count: existingHistory.length + 1,
              outreach_history: [...existingHistory, newEntry],
            },
          })
          .eq("id", matchId);

        await supabaseAdmin.from("supplier_outreach_logs").insert({
          match_id: matchId,
          supplier_id: supplierId,
          channel: "email",
          message: `To: ${contactEmail}\nSubject: ${emailResult.subjectUsed || personalizedSubject}\n\n${personalizedBody}`,
          sent_by: "admin_new_supplier",
          sent_at: sentAtIso,
        });

        await createNotification(
          "match_sent",
          `New Supplier Outreach Sent: ${companyName}`,
          `Added ${companyName} (${contactEmail}) to [FDX-REQ-${shortReqId}] and dispatched cooperation email via ${deliveryProvider.toUpperCase()}.`,
          {
            match_id: matchId,
            supplier_id: supplierId,
            request_id: requestId,
            recipient_email: contactEmail,
          }
        );
      } else {
        emailError = emailResult.error || "Email dispatch failed";
      }
    }

    try {
      revalidatePath("/admin/outreach");
      revalidatePath(`/admin/requests/${requestId}`);
    } catch {}

    return NextResponse.json({
      ok: true,
      supplierId,
      matchId,
      requestId,
      sent: Boolean(deliveryProvider),
      provider: deliveryProvider,
      emailError,
    });
  } catch (err: any) {
    console.error("POST /api/admin/outreach/new-supplier error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add and email new supplier" },
      { status: 500 }
    );
  }
}
