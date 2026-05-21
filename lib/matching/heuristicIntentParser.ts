export interface ParsedIntent {
  keywords: string[];
  packagingTerms: string[];
  certTerms: string[];
  marketTerms: string[];
  privateLabel: boolean | null;
}

const STOPWORDS = new Set([
  "a","an","the","and","or","for","with","in","of","to","from",
  "i","we","our","need","want","looking","please","some","any",
  "that","this","have","is","are","be","at","on","as","it","its",
]);

const PACKAGING_TERMS = [
  "cup","cups","jar","jars","can","cans","tin","tins","bottle","bottles",
  "pouch","pouches","sachet","sachets","tray","trays","box","boxes",
  "bag","bags","tube","tubes","doypack","tetra","carton","cartons",
  "bulk","drum","drums","ibc",
  "100g","200g","300g","400g","500g","750g","1kg","2kg","5kg","10kg",
  "100ml","200ml","250ml","330ml","500ml","750ml","1l","1.5l","2l",
];

const CERT_TERMS = [
  "kosher","halal","organic","bio","brc","ifs","fssc","haccp","iso",
  "vegan","gluten free","gluten-free","non-gmo","fair trade","rainforest",
];

const MARKET_TERMS = [
  "retail","supermarket","foodservice","food service","restaurant",
  "catering","industrial","ingredient","private label","own label",
  "b2b","wholesale",
];

const PRIVATE_LABEL_POSITIVE = ["private label","own label","pl","white label"];
const PRIVATE_LABEL_NEGATIVE = ["branded","brand only","no private label"];

export function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase();

  const tokens = lower.split(/[\s,/]+/);
  const keywords = Array.from(
    new Set(tokens.filter((t) => t.length >= 3 && !STOPWORDS.has(t)))
  ).slice(0, 20);

  const containsAny = (terms: string[]) => terms.filter((t) => lower.includes(t));

  const packagingTerms = containsAny(PACKAGING_TERMS);
  const certTerms = containsAny(CERT_TERMS);
  const marketTerms = containsAny(MARKET_TERMS);

  const privateLabel = PRIVATE_LABEL_POSITIVE.some((t) => lower.includes(t))
    ? true
    : PRIVATE_LABEL_NEGATIVE.some((t) => lower.includes(t))
    ? false
    : null;

  return { keywords, packagingTerms, certTerms, marketTerms, privateLabel };
}
