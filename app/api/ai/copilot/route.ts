import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generateGeminiWithFallback } from "@/lib/ai/models";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ActionPill {
  label: string;
  href: string;
}

const SYSTEM_KNOWLEDGE_PROMPT = `You are the FoodXchange AI Copilot — an expert B2B food trade, sourcing, compliance, and platform operations guide.
You serve Israeli supermarket buyers, private label category managers, European food manufacturers, and FoodXchange desk admins.

FOODXCHANGE PLATFORM SITEMAP & ACTIONS:
- New Sourcing Request with Machine Vision: [/admin/requests/new] (Drag & drop product/packaging photo to extract benchmark brand, size, format, SI 1145 labels, kosher marks, and run instant matching vs 80,000+ catalog items)
- Sourcing Requests List: [/admin/requests]
- Deal Pipeline: [/admin/pipeline] (End-to-end deal tracker: Brief -> Spec -> Samples -> Pricing -> PO)
- Tasting Samples Desk: [/admin/samples] (Order/dispatch physical European food sample boxes via DHL Express with nominal customs waiver €10)
- Pro-Forma & Deals / PO: [/admin/deals] (Issue commercial POs, lock margins, 30/70 payment milestones)
- Mixed Container Builder: [/en/calculator/container] (FCL 20ft & 40ft High Cube mixed pallet builder)
- Smart RFQ Matchmaker: [/en/rfq] (Generate bilateral RFQ pitch decks)
- AI Spec Sheet to SI 1145: [/admin/tools/spec-extractor] (Convert Italian/European 'Scheda Tecnica' into Israeli SI 1145 compliant food labels)
- Product Catalog: [/admin/products] (Search 80k+ items, filter by Kosher Badatz/Rabbinate, BRC, IFS, FSSC, ISO, Gluten-Free, Organic)
- Suppliers Network: [/admin/suppliers] (Verified European & global food manufacturers)
- Buyers Directory: [/admin/buyers] (Israeli supermarket retail chains & institutional importers)
- Landed Cost Calculator: [/he/calculator] (Simulate CIF Haifa/Ashdod, import duties, port fees, broker margins)

ANSWER GUIDELINES:
1. Tone: Friendly, authoritative, practical, and clear (like an expert Intercom concierge).
2. Format: Structure the answer in clean numbered steps or concise sections.
3. Embedded Links: When mentioning any section or capability, ALWAYS embed exact markdown links using standard format [Link Name](/path) matching the sitemap above.
4. Language: If the user asks in Hebrew, reply in Hebrew. If in English, reply in English.
5. Specificity: Provide concrete trade facts (SI 1145 thresholds: Sodium >= 400mg, Sugar >= 10g, Saturated fat >= 4g; DHL samples €10 customs waiver; Badatz / Chief Rabbinate kosher rules; CIF vs FOB).`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, role = "buyer", lang = "he", history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const recentHistory = Array.isArray(history)
      ? history.slice(-4).map((h: any) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n\n")
      : "";

    const fullPrompt = `${SYSTEM_KNOWLEDGE_PROMPT}

USER ROLE: ${role}
PREFERRED LANGUAGE: ${lang}

CONVERSATION HISTORY:
${recentHistory}

USER QUESTION:
${message}

Please provide a structured, step-by-step, friendly answer with exact clickable markdown links where relevant.`;

    let replyText = "";
    const actionPills: ActionPill[] = [];

    try {
      const dummyClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });
      const result = await generateGeminiWithFallback(dummyClient, {
        contents: fullPrompt,
        config: {
          temperature: 0.2,
        },
      });
      replyText = result.text;
    } catch (err: any) {
      console.warn("Copilot LLM fallback invoked:", err?.message || err);
    }

    // Dynamic extraction of action pills from reply text links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    const seenHrefs = new Set<string>();

    if (replyText) {
      while ((match = linkRegex.exec(replyText)) !== null) {
        const label = match[1];
        const href = match[2];
        if (href.startsWith("/") && !seenHrefs.has(href)) {
          seenHrefs.add(href);
          actionPills.push({ label, href });
          if (actionPills.length >= 3) break;
        }
      }
    }

    // Ultimate fallback if LLM returned empty
    if (!replyText) {
      if (lang === "he") {
        replyText = `### איך להתחיל פרויקט סורסינג ב-FoodXchange 🚀

1. **הזנת דרישת רכש עם בינה חזותית**:
   היכנס אל [✨ דרישת רכש חדשה עם Vision](/admin/requests/new), גרור תמונת מוצר או אריזה. ה-AI יחלץ אוטומטית את שם המוצר, המותג, משקל/נפח וכשרויות גלויות.

2. **תיאור קצר בהודעה**:
   הזן בתיבת ההערות את יעד מחיר היבוא (CIF אשדוד/חיפה), כמויות מבוקשות ודרישות מותג פרטי.

3. **סריקה מול 80,000+ מוצרים**:
   המערכת תדרג מיידית מפעלים אירופאים בעלי תקני **BRC, IFS וכשרות הרבנות/בד״ץ**.

4. **הזמנת דוגמאות טעימה**:
   בדסק [📦 דוגמאות טעימה](/admin/samples) תוכלו לשגר ערכת דוגמאות ב-DHL ישירות לשולחן הבדיקה.`;
        actionPills.push(
          { label: "דרישת רכש חדשה (Vision)", href: "/admin/requests/new" },
          { label: "קטלוג מוצרים", href: "/admin/products" },
          { label: "דסק דוגמאות", href: "/admin/samples" }
        );
      } else {
        replyText = `### How to start your sourcing workflow on FoodXchange 🚀

1. **Intake with Machine Vision**:
   Go to [✨ New Sourcing Request (Vision Intake)](/admin/requests/new) and drop your product packaging photo. The AI automatically identifies benchmark brands, pack formats, nutrition seals, and visible kosher markings.

2. **Specify Commercial Terms**:
   Add target CIF Ashdod/Haifa price, expected container volumes, and private label requirements.

3. **Instant Catalog Matching**:
   The engine cross-references your brief across 80,000+ European factory items, verifying **BRC, IFS, ISO, and Kosher certifications**.

4. **Dispatch Tasting Samples**:
   Track air courier sample kits via [📦 Tasting Samples Desk](/admin/samples) with pre-cleared nominal customs waivers.`;
        actionPills.push(
          { label: "New Sourcing Request (Vision)", href: "/admin/requests/new" },
          { label: "Product Catalog", href: "/admin/products" },
          { label: "Deal Pipeline", href: "/admin/pipeline" }
        );
      }
    }

    return NextResponse.json({
      reply: replyText,
      actionPills: actionPills.slice(0, 4),
    });
  } catch (error: any) {
    console.error("Copilot API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
