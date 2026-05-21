import { parseIntent as parseIntentAI } from "@/lib/ai/intentParser";
import { supabase } from "@/lib/supabase";
import type { IntentResult } from "@/lib/ai/intentSchema";

export interface ScoredItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  markets: string[];
  private_label: boolean;
  formats: string[];
  certifications: string[];
  tags: string[];
  hero_image: string | null;
  priority: number;
  countries: string[];
  score: number;
}

export interface MatchInput {
  text: string;
  market?: string | null;
  privateLabel?: boolean | null;
  limit?: number;
}

export interface MatchOutput {
  intent: IntentResult;
  results: ScoredItem[];
  parsed_by: string;
}

type CandidateItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  markets: string[] | null;
  private_label: boolean | null;
  formats: string[] | null;
  certifications: string[] | null;
  tags: string[] | null;
  hero_image: string | null;
  priority: number;
  countries: string[] | null;
};

function scoreItem(
  item: CandidateItem,
  intent: IntentResult,
  explicitMarket?: string | null,
  explicitPrivateLabel?: boolean | null
): number {
  let score = 0;
  const tags = (item.tags || []).map((t) => t.toLowerCase());
  const formats = (item.formats || []).map((f) => f.toLowerCase());
  const certs = (item.certifications || []).map((c) => c.toLowerCase());
  const markets = (item.markets || []).map((m) => m.toLowerCase());
  const countries = (item.countries || []).map((c) => c.toLowerCase());
  const titleLower = (item.title || "").toLowerCase();
  const summaryLower = (item.summary || "").toLowerCase();

  for (const kw of intent.keywords) {
    if (tags.includes(kw)) score += 3;
    if (titleLower.includes(kw)) score += 2;
    if (summaryLower.includes(kw)) score += 1;
  }
  if (intent.product && titleLower.includes(intent.product.toLowerCase())) score += 5;
  for (const pt of intent.packaging) {
    if (formats.some((f) => f.includes(pt))) score += 4;
  }
  for (const ct of intent.certifications) {
    if (certs.some((c) => c.includes(ct))) score += 3;
  }
  if (intent.kosher === true && certs.includes("kosher")) score += 4;
  const marketCheck = explicitMarket?.toLowerCase() ?? intent.market?.toLowerCase();
  if (marketCheck && markets.some((m) => m.includes(marketCheck))) score += 5;
  const plCheck = explicitPrivateLabel ?? intent.private_label;
  if (plCheck !== null && plCheck !== undefined && item.private_label === plCheck) score += 4;
  for (const cp of intent.country_preferences) {
    if (countries.some((c) => c.includes(cp.toLowerCase()))) score += 2;
  }
  if (intent.temperature) {
    const temp = intent.temperature.toLowerCase();
    if (tags.some((t) => t.includes(temp))) score += 2;
  }
  score += Math.min(item.priority, 20) * 0.25;
  return score;
}

const COLS =
  "id,title,slug,summary,category,markets,private_label,formats,certifications,tags,hero_image,priority,countries";

export async function runMatch(input: MatchInput): Promise<MatchOutput> {
  const { text, market, privateLabel, limit = 6 } = input;
  const intent = await parseIntentAI(text);

  let candidates: CandidateItem[] = [];

  if (intent.keywords.length > 0) {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select(COLS)
      .eq("published", true)
      .overlaps("tags", intent.keywords)
      .limit(50);
    if (error) console.error("runMatch Phase 1 error:", error);
    else candidates = (data || []) as CandidateItem[];
  }

  if (candidates.length < 3) {
    const existing = new Set(candidates.map((c) => c.id));
    let q = supabase.from("portfolio_items").select(COLS).eq("published", true);
    if (intent.packaging.length > 0) {
      q = q.overlaps("formats", intent.packaging).limit(50);
    } else {
      q = q.order("priority", { ascending: false }).limit(6);
    }
    const { data, error } = await q;
    if (error) console.error("runMatch Phase 2 error:", error);
    else {
      const extra = ((data || []) as CandidateItem[]).filter((i) => !existing.has(i.id));
      candidates = [...candidates, ...extra];
    }
  }

  const results = candidates
    .map((item) => ({
      ...item,
      markets: item.markets || [],
      private_label: item.private_label ?? false,
      formats: item.formats || [],
      certifications: item.certifications || [],
      tags: item.tags || [],
      countries: item.countries || [],
      score: scoreItem(item, intent, market, privateLabel),
    }))
    .filter((item) => item.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    intent,
    results,
    parsed_by: process.env.AI_PROVIDER ?? "none",
  };
}
