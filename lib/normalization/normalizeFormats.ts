type Rule = { patterns: string[]; canonical: string };

const RULES: Rule[] = [
  { patterns: ["aseptic bag", "bag in box", "bag-in-box"], canonical: "aseptic_bag" },
  { patterns: ["stand-up pouch", "standing pouch", "pouch", "sachet"], canonical: "pouch" },
  { patterns: ["plastic cup", "pp cup", "cup"], canonical: "cup" },
  { patterns: ["tin can", "canned", "can"], canonical: "tin" },
  { patterns: ["glass jar", "jar"], canonical: "jar" },
  { patterns: ["squeeze tube", "tube"], canonical: "tube" },
  { patterns: ["pet bottle", "glass bottle", "bottle"], canonical: "bottle" },
  { patterns: ["ibc", "tanker", "bulk"], canonical: "bulk" },
  { patterns: ["tray"], canonical: "tray" },
  { patterns: ["carton", "box"], canonical: "carton" },
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

export function normalizeFormats(raw: string[]): string[] {
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
