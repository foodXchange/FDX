type Rule = { patterns: string[]; canonical: string };

const RULES: Rule[] = [
  { patterns: ["kosher badatz", "badatz"], canonical: "kosher_badatz" },
  { patterns: ["kosher mehadrin", "mehadrin"], canonical: "kosher_mehadrin" },
  { patterns: ["ou kosher", "ou"], canonical: "kosher_ou" },
  { patterns: ["kosher certified", "chief rabbinate", "kosher"], canonical: "kosher" },
  { patterns: ["halal certified", "halal"], canonical: "halal" },
  { patterns: ["eu organic", "bio", "organic"], canonical: "organic" },
  { patterns: ["brcgs", "brc food", "brc"], canonical: "brc" },
  { patterns: ["ifs food", "ifs"], canonical: "ifs" },
  { patterns: ["iso22000", "iso 22000"], canonical: "iso_22000" },
  { patterns: ["haccp"], canonical: "haccp" },
  { patterns: ["gluten-free", "gluten free"], canonical: "gluten_free" },
  { patterns: ["vegan"], canonical: "vegan" },
  { patterns: ["non-gmo", "non gmo"], canonical: "non_gmo" },
];

function matchOne(value: string): string {
  const lower = value.toLowerCase().trim();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => lower === p || lower.includes(p))) {
      return rule.canonical;
    }
  }
  return lower;
}

export function normalizeCertifications(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const v of raw) {
    if (!v.trim()) continue;
    const normalized = matchOne(v);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}
