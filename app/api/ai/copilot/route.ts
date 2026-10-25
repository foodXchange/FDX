import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/ai/models";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ActionPill {
  label: string;
  href: string;
}

// ── ROBUST LOCAL KNOWLEDGE BASE (Guaranteed 100% offline & zero-credit resilience) ──
interface KnowledgeEntry {
  keywords: string[];
  role?: "buyer" | "supplier" | "admin" | "all";
  responseHe: string;
  responseEn: string;
  actionPills: ActionPill[];
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ["סימון אדום", "1145", "ת״י 1145", "סוכר", "נתרן", "שומן רווי", "מדבקה אדומה", "red badge", "warning badge"],
    responseHe: `### תקן ת״י 1145 וסימונים אדומים (מזון ארוז מראש) 🔴

בישראל, מוצרי מזון מוצקים החורגים מהרמות הבאות ל-100 גרם מחויבים בסימון סמל אדום בחזית האריזה:
1. **נתרן (מלח)**: 400 מ״ג ומעלה ל-100 גרם מוצר.
2. **סוכרים**: 10.0 גרם ומעלה ל-100 גרם מוצר.
3. **שומן רווי**: 4.0 גרם ומעלה ל-100 גרם מוצר.

**איך FoodXchange מסייעת למותג פרטי?**
- מערכת ה-Label Checker שלנו מחשבת אוטומטית את הערכים ומעדכנת האם המוצר נדרש לסמל אדום.
- אנו מייצרים עבור הסטודיו הגרפי של המפעל באירופה קובץ גלופת דפוס מדויק עם ניסוח הרכיבים והאלרגנים בעברית לפי התקן.`,
    responseEn: `### Israeli Standard SI 1145 & Mandatory Red Warning Badges 🔴

Solid pre-packaged food products exceeding the following thresholds per 100g must display front-of-package red circular warning symbols:
1. **Sodium (Salt)**: >= 400 mg per 100g.
2. **Total Sugars**: >= 10.0 g per 100g.
3. **Saturated Fat**: >= 4.0 g per 100g.

**How FoodXchange assists your private label:**
- Our AI Label Checker evaluates nutritional specs and calculates badge triggers automatically.
- We supply the European factory design studio with exact Hebrew ingredient clauses, allergen formatting, and vector overlays before printing plates are engraved.`,
    actionPills: [
      { label: "בדיקת סימון אדום (Label Checker)", href: "/admin/compliance/label-checker" },
      { label: "מדריך קניינים מלא", href: "/he/guide" },
    ],
  },
  {
    keywords: ["דוגמא", "דגימה", "טעימה", "sample", "courier", "dhl", "fedex", "איסוף דוגמאות", "ערכת"],
    responseHe: `### דסק דוגמאות טעימה ומבחן סנסורי 📦

ב-FoodXchange קנייני רשתות מקבלים ערכות טעימה פיזיות ישירות לשולחן העבודה:
1. **שילוח אקספרס מבוקר**: דוגמאות מגיעות מאירופה בבלדרות אווירית (DHL/FedEx).
2. **שחרור מכס מהיר**: הדסק דואג לאישורי שחרור ללא עלות וללא עיכובים בירוקרטיים.
3. **שאלון הערכה בן 5 ממדים בפורטל**:
   - טעם וארומה (איזון לחך הישראלי)
   - מרקם ונראות
   - התאמת אריזה למדף קמעונאי
   - חיי מדף ויציבות
   - כדאיות מסחרית ביחס למחירי השוק
4. **אישור הדוגמה**: מקדם את הפרויקט מיד לקבלת הצעת מחיר סופית (CIF Haifa) וסגירת מכולה.`,
    responseEn: `### Tasting Samples Desk & Sensory Evaluation Hub 📦

Verified supermarket buyers receive physical European factory sample boxes directly to their evaluation table:
1. **Fast-Track Air Courier**: Dispatched via DHL/FedEx with pre-cleared customs waivers.
2. **Zero Buyer Expense**: Sample kits are provided free of charge for approved sourcing projects.
3. **5-Dimension Sensory Scorecard in your portal**:
   - Taste & Aroma
   - Texture & Mouthfeel
   - Retail Packaging & Shelf Presence
   - Shelf Life & Thermal Stability
   - Commercial Price-to-Quality Fit
4. **Approval**: Advance the deal directly to final CIF Haifa quotation locking and container scheduling.`,
    actionPills: [
      { label: "הזמנת ערכת טעימה מהקטלוג", href: "/he/products" },
      { label: "פורטל מעקב דוגמאות", href: "/track" },
    ],
  },
  {
    keywords: ["מכס", "חשבונית דוגמאות", "awb", "invoice", "customs waiver", "nominal value", "שחרור מכס"],
    role: "supplier",
    responseHe: `### תבנית חשבונית לשחרור דוגמאות במכס ✈️
חשוב מאוד לציין בחשבונית הבלדרות (DHL/FedEx) ערך סמלי של 10 אירו ולהצהיר כי המוצרים מיועדים למבחן סנסורי בלבד וללא ערך מסחרי:
"Food samples for organoleptic / sensory testing only. No commercial value. Not for retail sale. Value for customs: €10."`,
    responseEn: `### Courier Sample Customs Invoice Protocol ✈️

To prevent DHL/FedEx holds at Ben Gurion Airport (TLV), European factories must declare:
- **Description**: "Food samples for organoleptic and sensory testing only. No commercial value. Not for retail sale or commercial distribution."
- **Declared Value**: Stated strictly as nominal customs value (e.g., **€10.00 EUR total**). Values exceeding €20 trigger mandatory VAT and physical veterinary inspections.
- **Copies**: Include 3 signed copies of the pro-forma invoice in the clear adhesive pouch outside the parcel.
- **Notify**: Immediately share the AWB courier tracking number with \`desk@fdx.trading\`.`,
    actionPills: [
      { label: "Open Supplier Export Guide", href: "/en/supplier-guide" },
      { label: "Contact Deal Desk", href: "/en/contact" },
    ],
  },
  {
    keywords: ["כשרות", "רבנות", "בד״ץ", "הרבנות הראשית", "kosher", "rabbinate", "ou", "ok", "badatz"],
    responseHe: `### נהלי כשרות ליבוא מזון לישראל 📜

1. **אישור מחלקת היבוא של הרבנות הראשית**: כל מוצר המשווק ברשתות השיווק המרכזיות בישראל מחייב תעודת הכשר רשמית מהרבנות הראשית.
2. **גופי כשרות בינלאומיים מוכרים**: OU, OK, Star-K, כף-K, חוג חתם סופר, בד״ץ וכד׳.
3. **מפעלים שאינם כשרים כיום**: אין צורך בהסבה שנתית של המפעל. FoodXchange מלווה ארגון **סבב יצור ייעודי (Kosher Batch Campaign)** של יומיים-שלושה תחת פיקוח משלחת רבנים, ללא שינוי קבוע בקווי היצור.`,
    responseEn: `### Kosher Import Authorization & Factory Protocols 📜

1. **Chief Rabbinate of Israel Import Division**: Mainstream retail distribution requires an official import permit from the Rabbinate.
2. **Recognized International Agencies**: OU, OK, Star-K, Badatz, Kof-K, etc.
3. **Non-Kosher European Facilities**: You do NOT need permanent kosher factory conversion. We coordinate **turnkey Kosher Production Campaigns** where a rabbinical delegation supervises a dedicated 2-to-3 day batch run following scheduled equipment sanitization.`,
    actionPills: [
      { label: "קטלוג מוצרים לפי כשרות", href: "/he/products" },
      { label: "מדריך רגולציה וכשרות", href: "/he/import-guide" },
    ],
  },
  {
    keywords: ["עלות נחיתה", "מחשבון", "cif", "fob", "שער מחסן", "landed cost", "calculator", "רווחיות"],
    responseHe: `### מחשבון עלות שער מחסן (Landed Cost Simulator) ⚡

מחשבון FoodXchange ממיר הצעת מחיר CIF נמל חיפה או אשדוד לעלות אמיתית במרלו״ג:
- **מרכיבי החישוב**: מחיר FOB/CIF במט״ח, הובלה ימית, ביטוח ימי, פריקה ואגרות נמל, מכס (במידה וחל), ואגרת שחרור משרד הבריאות.
- **ניתוח מרווח קמעונאי**: השוואה ישירה מול מחיר המדף של המותג המוביל בישראל ובדיקת שיעור הרווח הגולמי (Gross Margin) לרשת.`,
    responseEn: `### Landed Cost Simulator & Port Logistics ⚡

Our simulator translates CIF Port of Haifa or Ashdod quotes into true warehouse gate costs:
- **Factored Inputs**: Base CIF EUR/USD, ocean freight, marine insurance, terminal handling fees (THC), Israeli port dues, and health inspection waivers.
- **Margin Benchmark**: Simulates supermarket shelf margin gains when replacing expensive national brands with direct European OEM alternatives.`,
    actionPills: [
      { label: "פתח את מחשבון עלות הנחיתה", href: "/he/calculator" },
      { label: "מטריצת החלפת מותגי מדף", href: "/he/benchmark" },
    ],
  },
  {
    keywords: ["מכולה", "fcl", "20ft", "40ft", "container", "משטח", "pallet", "moq"],
    responseHe: `### תקני העמסת מכולות והזמנות יבוא 🚢

- **מכולת 20 רגל (20ft Dry Box)**: כ-11 משטחי יורו (800x1200) או 9-10 משטחים תעשייתיים (1000x1200). משקל מטען מקסימלי: כ-21 טון.
- **מכולת 40 רגל High Cube (40ft HC)**: כ-24-25 משטחי יורו או 20-21 משטחים תעשייתיים. אידיאלי למוצרים בנפח גבוה ומשקל נמוך (פסטה, ביסקוויטים, חטיפים).
- **תנאי אספקה מועדפים**: קניינים בישראל מתמחרים לרוב ב-**CIF נמל חיפה או נמל אשדוד** ביורו (€) או דולר ($).`,
    responseEn: `### Container Palletization & Capacity Standards 🚢

- **20ft Dry Box FCL**: Accommodates 11 Euro pallets (800x1200mm) or 9-10 Industrial pallets (1000x1200mm). Max payload: ~21 metric tons.
- **40ft High Cube (HC) FCL**: Accommodates 24-25 Euro pallets or 20-21 Industrial pallets. Ideal for high-volume, lower-density retail groceries (pasta, bakery, snacks).
- **Quoting Standards**: Israeli buyers prefer quoting CIF Haifa or Ashdod per consumer unit in EUR (€) or USD ($), stating carton count and pallet stack configuration.`,
    actionPills: [
      { label: "מדריך יצוא ליצרנים", href: "/en/supplier-guide" },
      { label: "מחשבון עלויות והובלה", href: "/he/calculator" },
    ],
  },
  {
    keywords: ["תשלום", "תנאי תשלום", "30%", "70%", "payment terms", "deposit", "bill of lading", "שטר מטען"],
    responseHe: `### תנאי תשלום ובנקאות מסחרית 🔒

העסקאות ב-FoodXchange מתנהלות לפי נוהג הבנקאות הבינלאומי (Incoterms 2020):
1. **30% מקדמה**: משולמת על ידי הרשת/היבואן עם חתימת הסכם ההזמנה (PO) ואישור גלופות הדפוס.
2. **70% יתרת תשלום**: משולמת בהעברה בנקאית כנגד הצגת העתק שטר מטען ימי (Bill of Lading - B/L) ותעודת אנליזה מעבדתית (COA) טרם שחרור המקור.`,
    responseEn: `### Commercial Payment Security & Milestone Terms 🔒

All B2B transactions executed through FoodXchange adhere to standardized international banking milestones:
1. **30% Advance Wire Transfer**: Remitted by the buyer upon countersigning the Purchase Order and approving final packaging dielines.
2. **70% Final Balance**: Remitted against transmission of the Ocean Bill of Lading (B/L) copy, packing list, and laboratory Certificate of Analysis (COA) before original document release.`,
    actionPills: [
      { label: "European Supplier Export Guide", href: "/en/supplier-guide" },
      { label: "פורטל מעקב פרויקט", href: "/track" },
    ],
  },
  {
    keywords: ["pipeline", "שלבים", "deal desk", "תהליך", "stages", "סקראפר", "scraper", "ניהול"],
    role: "admin",
    responseHe: `### 6 שלבי ה-Deal Desk ב-FoodXchange 🎯
1. **Inquiry & PIP**: קליטת דרישה וניתוח AI Intent.
2. **Bulk RFQ**: הפצת בקשות מחיר למפעלים מתאימים.
3. **Sample Testing**: שילוח ערכת טעימה ומילוי משוב 5 ממדים.
4. **Meet & AI Summarizer**: פגישת וידאו וסיכום פרוטוקול עסקי.
5. **PO Generation**: הפקת הזמנת רכש מכולה דו-לשונית.
6. **Production & Vessel**: מעקב יצור ושטר מטען לנמל חיפה/אשדוד.`,
    responseEn: `### FDX Deal Desk Operations (6 Pipeline Stages) 🎯
1. **Stage 1 (Inquiry & PIP)**: Natural language parsing into Product Intent Profile and vector candidate matching.
2. **Stage 2 (Bulk RFQ)**: One-click outreach to matched European factories for CIF benchmark bids.
3. **Stage 3 (Tasting Samples Hub)**: Dispatching express courier sample kits and scoring 5-dimension sensory feedback.
4. **Stage 4 (Google Meet & AI Summarizer)**: Dual-timezone video meet and AI extraction of commercial commitments.
5. **Stage 5 (B2B Purchase Order)**: Generating formal bilingual Hebrew/English POs with 30/70 milestones.
6. **Stage 6 (Production & Vessel Tracking)**: Signing off on SI 1145 labels, kosher schedule, and ocean container ETA.`,
    actionPills: [
      { label: "פתח את ה-Deal Pipeline", href: "/admin/pipeline" },
      { label: "מרכז דוגמאות טעימה", href: "/admin/samples" },
      { label: "Label Compliance Checker", href: "/admin/compliance/label-checker" },
    ],
  },
];

function findLocalKnowledge(query: string, preferredRole: string): KnowledgeEntry | null {
  const lower = query.toLowerCase();

  // Score each entry based on matching keywords
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    if (entry.role && entry.role !== "all" && entry.role !== preferredRole && preferredRole !== "admin") {
      // Allow admin to query any category, but bias role matching
      continue;
    }

    let matchCount = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        matchCount += kw.length; // weight longer keywords higher
      }
    }

    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = entry;
    }
  }

  return bestScore >= 3 ? bestMatch : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, role = "buyer", lang = "he" } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    let replyText = "";
    let actionPills: ActionPill[] = [];

    // 1. Try local verified knowledge engine first for instantaneous, 100% accurate trade answers
    const localMatch = findLocalKnowledge(message, role);
    if (localMatch) {
      replyText = lang === "he" ? localMatch.responseHe : localMatch.responseEn;
      actionPills = localMatch.actionPills;
    }

    // 2. If no direct local match, attempt LLM generation (Gemini) if available
    if (!replyText) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const res = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `You are the FoodXchange AI Copilot for B2B food import/export between Europe and Israel.
Context: Role=${role}, Language=${lang}
Question: ${message}
Answer with actionable, authoritative food sourcing details.`,
            config: {
              temperature: 0.2,
            },
          });
          replyText = res.text?.trim() || "";
        } catch {
          // LLM fallback triggers gracefully below
        }
      }
    }

    // 3. Fallback default if completely novel query
    if (!replyText) {
      if (lang === "he") {
        replyText = `דסק הסורסינג של FoodXchange עומד לשירותך! 

אנו מלווים קנייני רשתות ויבואנים בישראל באיתור מפעלי מזון אירופאים מאומתים, הזמנת דוגמאות טעימה ישירות למשרד, עמידה בתקן ת״י 1145 וכשרות הרבנות הראשית, וניהול הזמנות מכולה ישירות ללא פערי תיווך.

תוכל לשאול אותי על:
- **סימונים אדומים ותקן ת״י 1145**
- **הזמנת ערכת דוגמאות טעימה**
- **תחשיב עלות שער מחסן במחשבון**
- **בדיקת כשרות יבוא והסמכות מפעלים**
- **תקני העמסת מכולות 20ft ו-40ft HC**`;
        actionPills = [
          { label: "מדריך קניינים מלא 📖", href: "/he/guide" },
          { label: "מחשבון עלות נחיתה ⚡", href: "/he/calculator" },
          { label: "חיפוש בקטלוג המוצרים 📦", href: "/he/products" },
        ];
      } else {
        replyText = `The FoodXchange Trade & Sourcing Desk is at your service!

We connect verified European food factories directly with Israeli supermarket chains and food importers under transparent CIF terms with zero broker deductions from factory quotes.

Feel free to ask me about:
- **Quoting CIF Haifa vs FOB terms**
- **DHL/FedEx tasting sample customs waiver invoices**
- **Chief Rabbinate Kosher batch supervision protocols**
- **Israeli SI 1145 labeling & Red Warning Badges**
- **Container pallet loading (20ft vs 40ft High Cube)**
- **Standard 30/70 B2B payment terms**`;
        actionPills = [
          { label: "European Supplier Export Guide 🏭", href: "/en/supplier-guide" },
          { label: "Retail Buyer Sourcing Guide 🛒", href: "/en/guide" },
          { label: "Contact Deal Desk ✉️", href: "/en/contact" },
        ];
      }
    }

    return NextResponse.json({
      reply: replyText,
      actionPills: actionPills.slice(0, 3),
    });
  } catch (error: any) {
    console.error("Copilot API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
