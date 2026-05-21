'use server';
import { z } from "zod";
import { parseIntent } from "@/lib/ai/intentParser";

const SuggestInput = z.object({
  title: z.string(),
  summary: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
});

type SuggestResult =
  | {
      ok: true;
      tags: string[];
      formats: string[];
      certifications: string[];
      market: string | null;
      privateLabel: boolean | null;
    }
  | { ok: false; error: string };

export async function suggestPortfolioTaxonomy(input: {
  title: string;
  summary?: string | null;
  content?: string | null;
}): Promise<SuggestResult> {
  try {
    const parsed = SuggestInput.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid input" };
    }

    const text = [parsed.data.title, parsed.data.summary, parsed.data.content]
      .filter(Boolean)
      .join(" ");

    const intent = await parseIntent(text);

    const tags = intent.keywords
      .concat(intent.attributes)
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 15);

    const formats = intent.packaging
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean);

    const certifications = intent.certifications
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean);

    return {
      ok: true,
      tags,
      formats,
      certifications,
      market: intent.market ?? null,
      privateLabel: intent.private_label ?? null,
    };
  } catch {
    return { ok: false, error: "Could not parse content" };
  }
}
