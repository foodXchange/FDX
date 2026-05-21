import { z } from "zod";

export const IntentSchema = z.object({
  product: z.string().nullable(),
  product_family: z.string().nullable(),
  packaging: z.array(z.string()),
  pack_size_g: z.number().nullable(),
  pack_size_ml: z.number().nullable(),
  pack_size_kg: z.number().nullable(),
  market: z.enum(["Retail", "Foodservice", "Industry"]).nullable(),
  private_label: z.boolean().nullable(),
  certifications: z.array(z.string()),
  kosher: z.boolean().nullable(),
  temperature: z.enum(["Ambient", "Chilled", "Frozen"]).nullable(),
  country_preferences: z.array(z.string()),
  attributes: z.array(z.string()),
  keywords: z.array(z.string()),
  notes: z.string().nullable(),
  confidence: z.object({
    product: z.number().min(0).max(1),
    packaging: z.number().min(0).max(1),
    size: z.number().min(0).max(1),
    market: z.number().min(0).max(1),
    private_label: z.number().min(0).max(1),
    certifications: z.number().min(0).max(1),
  }),
});

export type IntentResult = z.infer<typeof IntentSchema>;

export const EMPTY_INTENT: IntentResult = {
  product: null,
  product_family: null,
  packaging: [],
  pack_size_g: null,
  pack_size_ml: null,
  pack_size_kg: null,
  market: null,
  private_label: null,
  certifications: [],
  kosher: null,
  temperature: null,
  country_preferences: [],
  attributes: [],
  keywords: [],
  notes: null,
  confidence: {
    product: 0,
    packaging: 0,
    size: 0,
    market: 0,
    private_label: 0,
    certifications: 0,
  },
};
