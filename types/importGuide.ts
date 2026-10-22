export interface ImportGuideArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  content: string | null;
  tags: string[];
  related_portfolio_slugs: string[];
  published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  reading_time_mins: number;
  created_at: string;
  updated_at: string;
}

export interface ImportGuideListItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  tags: string[];
  reading_time_mins: number;
  updated_at: string;
}

export const IMPORT_GUIDE_CATEGORIES = [
  {
    slug: "labeling",
    title: "Labeling Requirements",
    icon: "🏷️",
    description:
      "Hebrew labeling, ingredient declarations, nutrition facts, and packaging rules for the Israeli market.",
  },
  {
    slug: "kosher",
    title: "Kosher Certification",
    icon: "✡️",
    description:
      "Kosher certification bodies, processes, requirements by category, and what buyers expect.",
  },
  {
    slug: "standards",
    title: "Standards & Compliance",
    icon: "📋",
    description:
      "Israeli Standards Institute (SII) mandatory standards, SI marks, and compliance pathways.",
  },
  {
    slug: "permits",
    title: "Import Permits & Docs",
    icon: "📄",
    description:
      "Import permits, health certificates, phytosanitary documents, and customs clearance.",
  },
  {
    slug: "categories",
    title: "By Food Category",
    icon: "🍅",
    description:
      "Category-specific rules for tomato products, pasta, snacks, dairy, beverages, and more.",
  },
  {
    slug: "countries",
    title: "By Source Country",
    icon: "🌍",
    description:
      "Country-specific bilateral agreements, approved facilities, and trade arrangements with Israel.",
  },
  {
    slug: "cold-chain",
    title: "Cold Chain & Packaging",
    icon: "❄️",
    description:
      "Temperature requirements, cold chain documentation, and packaging specifications.",
  },
  {
    slug: "certifications",
    title: "Safety Certifications",
    icon: "🛡️",
    description:
      "BRC, IFS, FSSC 22000, HACCP — which certifications Israeli buyers require and why.",
  },
  {
    slug: "customs",
    title: "Customs & Duties",
    icon: "🏛️",
    description:
      "Tariff rates, VAT, customs procedures, free trade agreements, and duty calculations.",
  },
] as const;

export type ImportGuideCategory =
  (typeof IMPORT_GUIDE_CATEGORIES)[number]["slug"];

export const IMPORT_GUIDE_CATEGORIES_HE = [
  {
    slug: "labeling",
    title: "דרישות סימון ותוויות (ת״י 1145)",
    icon: "🏷️",
    description:
      "סימון מזון ארוז מראש בעברית, טבלת ערכים תזונתיים, סימונים אדומים (סוכר/נתרן/שומן רווי) והצהרת אלרגנים.",
  },
  {
    slug: "kosher",
    title: "כשרות ופיקוח הלכתי ביבוא",
    icon: "✡️",
    description:
      "נוהל מחלקת היבוא ברבנות הראשית לישראל, גופי כשרות מוכרים באירופה (OU, OK, בד״ץ), מסלולי כשרות מהדרין ופסח.",
  },
  {
    slug: "standards",
    title: "תקנים ורגולציית משרד הבריאות",
    icon: "📋",
    description:
      "רפורמת היבוא האירופאי ('מה שטוב לאירופה'), תקנים רשמיים, תוספי מזון מותרים ובדיקות מעבדה.",
  },
  {
    slug: "permits",
    title: "אישורי יבוא ומסמכי שחרור",
    icon: "📄",
    description:
      "אישורי יבוא מוקדמים, תעודות בריאות ופיטוסניטריות, הליך מסר (שער עולמי) ושחרור בתחנות ההסגר בנמלים.",
  },
  {
    slug: "categories",
    title: "מדריכים לפי קטגוריית מוצר",
    icon: "🍅",
    description:
      "דרישות ספציפיות לפי ענפים: שמן זית, טונה ושימורי דגים, פסטה ודגנים, חטיפים ומוצרי מאפה קפואים.",
  },
  {
    slug: "countries",
    title: "יבוא לפי מדינת מקור באירופה",
    icon: "🌍",
    description:
      "הסכמי סחר, מפעלי יצוא מאושרים ונהלי יבוא מאיטליה, ספרד, יוון, בלגיה, פורטוגל וטורקיה.",
  },
  {
    slug: "cold-chain",
    title: "שרשרת קירור, הקפאה ואריזה",
    icon: "❄️",
    description:
      "דרישות טמפרטורה ביבוא ימי (Reefer), ניטור שרשרת קירור, תקני אריזת מכולות והובלה מבוקרת.",
  },
  {
    slug: "certifications",
    title: "תקני בטיחות בינלאומיים (BRC / IFS)",
    icon: "🛡️",
    description:
      "תקני BRC, IFS, FSSC 22000 ו-HACCP — מה רשתות השיווק בישראל דורשות מכל מפעל אירופאי ולמה.",
  },
  {
    slug: "customs",
    title: "מכס, מיסוי והסכמי סחר חופשי",
    icon: "🏛️",
    description:
      "פרטי מכס (HS Codes), שיעורי מכס, מע״מ יבוא (18%), חישוב עלות נחיתה והסכם הסחר ישראל-האיחוד האירופי (EUR.1).",
  },
] as const;
