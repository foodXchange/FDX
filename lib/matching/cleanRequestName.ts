const BUYER_NAMES = [
  "Shufersal",
  "Yochananof",
  "Ta'aman",
  "Rami Levy",
  "ProPlus",
  "Foodz",
  "L&R Global",
  "Fresco",
  "Hazeva",
  "Leiman",
  "Schlussel",
  "Achim Cohen",
  "H. Cohen",
  "Osher Ad",
  "Victory",
];

const BRAND_NAMES = [
  "balconi",
  "La doria",
  "Serena",
  "Meuloliva",
  "Canoliva",
];

export function cleanRequestName(productName: string): string {
  let cleaned = productName;

  for (const buyer of BUYER_NAMES) {
    const escaped = buyer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(",?\\s*" + escaped + "\\s*,?", "gi");
    cleaned = cleaned.replace(regex, "");
  }

  for (const brand of BRAND_NAMES) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped + "\\s*,?\\s*", "gi");
    cleaned = cleaned.replace(regex, "");
  }

  cleaned = cleaned
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

export function extractFormatHints(productName: string): string[] {
  const hints: string[] = [];

  const weightMatches = productName.match(/(\d+)\s*(g|gr|kg|liter|litre|L|ml)/gi);
  if (weightMatches) hints.push(...weightMatches);

  const containers = [
    "can",
    "jar",
    "bottle",
    "bag",
    "box",
    "cup",
    "pouch",
    "tin",
    "drum",
    "bulk",
    "PET",
    "glass",
  ];
  for (const c of containers) {
    if (productName.toLowerCase().includes(c.toLowerCase())) {
      hints.push(c);
    }
  }

  return hints;
}
