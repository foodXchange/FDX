import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      buyerEmail,
      buyerName,
      buyerCompany,
      projectTitle,
      benchmarkBrands,
      category,
      packagingFormat,
      estimatedVolume,
      brandingModel,
      targetMarket,
      selectedTags = [],
      naturalBrief,
      imageUrls = [],
      customSubject,
      customNotes,
    } = body;

    if (!buyerEmail || typeof buyerEmail !== "string" || !buyerEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid buyer email address is required" },
        { status: 400 }
      );
    }

    const brandingLabel =
      brandingModel === "private_label"
        ? "Private Label (Buyer's Brand OEM)"
        : brandingModel === "supplier_brand"
        ? "Supplier branded Line"
        : "Open to Factory Brands & Private Label";

    const certsList = Array.isArray(selectedTags) && selectedTags.length > 0
      ? selectedTags.join(", ")
      : "Standard EU Quality & Israeli Import Readiness";

    const subject =
      customSubject?.trim() ||
      `Sourcing Brief Confirmation: ${projectTitle || "Specialty Products"} — FoodXchange`;

    // Visual gallery thumbnails HTML if any images attached
    const imagesHtml =
      Array.isArray(imageUrls) && imageUrls.length > 0
        ? `
        <div style="margin-top: 20px;">
          <p style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px;">Attached Packaging & Reference Visuals (${imageUrls.length}):</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${imageUrls
              .map(
                (url: string, i: number) => `
              <div style="display: inline-block; margin-right: 8px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; text-align: center;">
                <img src="${url}" alt="Ref #${i + 1}" style="width: 120px; height: 90px; object-fit: cover; display: block;" />
                <span style="font-size: 10px; color: #64748b; padding: 2px 4px; display: block;">Ref #${i + 1}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>`
        : "";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px; color: #ffffff;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Food<span style="color: #f97316;">X</span>change</span>
              <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">Direct European Sourcing & Factory Matchmaking</p>
            </div>
            <span style="background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.4); color: #fb923c; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
              Sourcing Brief
            </span>
          </div>
        </div>

        <!-- Greeting & Content -->
        <div style="padding: 24px;">
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
            Hi ${buyerName || buyerCompany || "Valued Partner"},
          </h2>
          ${
            customNotes
              ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 18px; border-radius: 6px; font-size: 13px; color: #1e40af; line-height: 1.5;">
                  <strong style="color: #1e3a8a; display: block; margin-bottom: 4px;">Direct Note from FoodXchange:</strong>
                  ${customNotes.replace(/\n/g, "<br/>")}
                </div>`
              : ""
          }
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
            Thank you for aligning your sourcing goals with FoodXchange. Below is the confirmed operational brief for your sourcing project. Our deal desk is actively matching these specifications across verified European factories in Spain, Italy, Germany, and across the EU.
          </p>

          <!-- Specifications Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
            <tbody>
              ${
                projectTitle
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 140px; border-bottom: 1px solid #e2e8f0;">Target Product / Scope</td>
                      <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${projectTitle}</td>
                    </tr>`
                  : ""
              }
              ${
                benchmarkBrands
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Benchmark Brands</td>
                      <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${benchmarkBrands}</td>
                    </tr>`
                  : ""
              }
              ${
                category
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Category</td>
                      <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${category}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Packaging & Format</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${packagingFormat || "Standard Retail Packaging"}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Target Volume</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${estimatedVolume || "1 x 40ft HQ FCL / month (Mixed Pallets)"}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Branding Preference</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${brandingLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Dietary & Certifications</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                  <span style="display: inline-block; background: #ecfdf5; color: #047857; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                    ${certsList}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Target Market</td>
                <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${targetMarket || "Israel"}</td>
              </tr>
              ${
                naturalBrief
                  ? `<tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; vertical-align: top;">Project Notes & Brief</td>
                      <td style="padding: 10px 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${naturalBrief}</td>
                    </tr>`
                  : ""
              }
            </tbody>
          </table>

          ${imagesHtml}

          <!-- Next Steps Banner -->
          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 18px; margin-top: 20px;">
            <p style="margin: 0 0 6px; font-weight: 700; color: #9a3412; font-size: 13px;">What Happens Next?</p>
            <p style="margin: 0; font-size: 12px; color: #7c2d12; line-height: 1.5;">
              1. We filter qualified European manufacturers matching these dietary tags and minimum order quantities.<br/>
              2. We synthesize factory spec sheets, CIF landed pricing (Ashdod/Haifa), and lab sample logistics.<br/>
              3. If you have any modifications or extra benchmark references, simply reply to this email or reach us on WhatsApp.
            </p>
          </div>

          <div style="margin-top: 24px; text-align: center;">
            <a href="mailto:udi@fdx.trading?subject=Confirmed:%20${encodeURIComponent(projectTitle || "Sourcing Brief")}" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 8px;">
              ✓ Reply to Confirm Brief or Request Updates
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
          FoodXchange &middot; Tel Aviv &middot; Madrid &middot; Milan<br />
          Direct European Sourcing Network &middot; <a href="https://fdx.trading" style="color: #ea580c; text-decoration: none;">fdx.trading</a><br />
          Need immediate assistance? Call or WhatsApp: +972-50-858-6363
        </div>
      </div>
    </body>
    </html>
    `;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "FoodXchange <info@fdx.trading>";
      const bccEmail = process.env.NOTIFY_EMAIL_TO || "udi@fdx.trading";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: buyerEmail.trim().toLowerCase(),
        replyTo: "udi@fdx.trading",
        bcc: bccEmail,
        subject,
        html: htmlContent,
      });

      if (error) {
        console.error("Resend error sending brief confirmation:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        messageId: data?.id,
        recipient: buyerEmail,
        sentAt: new Date().toISOString(),
      });
    } else {
      // Mock / Offline fallback
      return NextResponse.json({
        ok: true,
        simulated: true,
        recipient: buyerEmail,
        sentAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error("Confirm brief endpoint error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
