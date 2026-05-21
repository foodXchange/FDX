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
