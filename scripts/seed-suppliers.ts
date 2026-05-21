/**
 * Seed script for supplier_offerings table.
 * Run with: npx tsx scripts/seed-suppliers.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Load .env.local before creating the Supabase client ───────────────────
// Static imports are hoisted, but createClient is called below — so loading
// env vars here is safe as long as we don't import supabaseAdmin directly.
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — assume env vars are already in the environment
  }
}

loadEnvLocal();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Type ───────────────────────────────────────────────────────────────────

type SupplierOffering = {
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country_of_origin: string | null;
  website: string | null;
  categories: string[];
  product_description: string | null;
  formats: string[];
  certifications: string[];
  markets_served: string[];
  countries_exported_to: string[];
  moq_units: number | null;
  moq_description: string | null;
  lead_time_days: number | null;
  private_label: boolean;
  own_brand: boolean;
  catalogue_url: string | null;
  hero_image: string | null;
  tags: string[];
  status: string;
  priority: number;
  verified: boolean;
  internal_notes: string | null;
};

// ─── Supplier data ──────────────────────────────────────────────────────────

const suppliers: SupplierOffering[] = [
  {
    company_name: "Aceites Canoliva S.L.",
    contact_name: null,
    contact_email: "export@canoliva.com",
    contact_phone: "+34 957 671 808",
    country_of_origin: "Spain",
    website: "https://canoliva.com/canoliva-premium/?lang=en",
    categories: ["Other", "Oils & Fats"],
    product_description:
      "Premium extra virgin olive oil produced from selected Picual variety olives in Córdoba, Andalusia. High aromatic complexity with balanced bitterness and pungency. Positioned as a flagship oil for premium culinary and finishing use. Family-owned with both traditional and modern extraction methods. Award-winning producer with recognition in EVOOLEUM and Olive Japan competitions.",
    formats: [
      "Bottle 500ml glass",
      "Tin 5L",
      "PET 5L",
      "Gift box 2-unit",
      "IBC bulk",
      "Tank bulk",
    ],
    certifications: ["IFS", "BRC", "JAS", "Kosher", "Organic CAAE"],
    markets_served: ["Retail", "Foodservice", "Industry"],
    countries_exported_to: ["30+ countries worldwide"],
    moq_units: null,
    moq_description: "Contact for MOQ details",
    lead_time_days: null,
    private_label: true,
    own_brand: true,
    catalogue_url:
      "https://canoliva.com/wp-content/uploads/2025/05/IFS_Aceites-Canoliva-2025.pdf",
    hero_image: null,
    tags: [
      "extra virgin olive oil",
      "picual",
      "spain",
      "premium oil",
      "retail bottles",
      "5L tin",
      "bulk supply",
      "private label",
      "kosher",
      "IFS certified",
      "BRC certified",
      "organic",
      "mediterranean",
      "foodservice",
      "olive oil producer",
    ],
    status: "approved",
    priority: 8,
    verified: true,
    internal_notes:
      "Strong certification portfolio. Export-oriented — 30+ countries. Good fit for Israeli premium retail and foodservice channels. Kosher certified — important for Israeli market.",
  },
  {
    company_name: "Steriltom S.r.l.",
    contact_name: "Gaia Rasparini",
    contact_email: "esales2@steriltom.com",
    contact_phone: "+39 0523 789811",
    country_of_origin: "Italy",
    website: "https://www.steriltom.com/en/index.html",
    categories: ["Tomato Products"],
    product_description:
      "Leading Italian processor of tomato derivatives — tomato pulp, diced tomatoes, purées, sauces, and paste. 100% Italian tomatoes from Emilia-Romagna. Uses sterilization and aseptic technologies. Founded 1934. European leader in tomato pulp for foodservice and industrial use. Pioneer in aseptic bag-in-box packaging. Processes hundreds of thousands of tons annually.",
    formats: [
      "Can 2.5kg",
      "Can 3kg",
      "Can 4.05kg",
      "Bag-in-box 2.6kg",
      "Bag-in-box 5kg",
      "Bag-in-box 10kg",
      "Bag-in-box 15kg",
      "Drum 210kg",
      "Big box 850kg",
      "Goodpack 1350kg",
    ],
    certifications: [
      "BRC",
      "IFS",
      "ISO 9001",
      "ISO 14001",
      "ISO 45001",
      "QC Emilia-Romagna",
      "Halal",
    ],
    markets_served: ["Foodservice", "Industry"],
    countries_exported_to: ["80+ countries worldwide"],
    moq_units: null,
    moq_description: "Contact for MOQ — large volume focus",
    lead_time_days: null,
    private_label: true,
    own_brand: false,
    catalogue_url:
      "https://www.steriltom.com/en/our-wholesale-formats-for-export.html",
    hero_image: null,
    tags: [
      "tomato pulp",
      "tomato paste",
      "diced tomatoes",
      "tomato puree",
      "italy",
      "bag in box",
      "aseptic packaging",
      "horeca",
      "industrial supply",
      "bulk tomato",
      "private label",
      "BRC certified",
      "IFS certified",
      "halal",
      "large formats",
      "foodservice",
      "emilia romagna",
    ],
    status: "approved",
    priority: 10,
    verified: true,
    internal_notes:
      "European leader in tomato pulp. Excellent for foodservice and industrial buyers. No kosher — important gap for Israeli retail. Strong for HoReCa and food industry channels. Contact: Gaia Rasparini directly.",
  },
];

// ─── Insert ─────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log("Seeding supplier_offerings…\n");

  for (const supplier of suppliers) {
    // Delete any existing row first (no-op if it doesn't exist)
    const { error: delError } = await supabaseAdmin
      .from("supplier_offerings")
      .delete()
      .eq("company_name", supplier.company_name);

    if (delError) {
      console.error(`✗ ${supplier.company_name} — DELETE failed`);
      console.error(`  ${delError.message}\n`);
      continue;
    }

    const { error: insertError } = await supabaseAdmin
      .from("supplier_offerings")
      .insert(supplier);

    if (insertError) {
      console.error(`✗ ${supplier.company_name} — INSERT failed`);
      console.error(`  ${insertError.message}\n`);
    } else {
      console.log(`✓ ${supplier.company_name} — OK`);
    }
  }

  // ─── Verification ────────────────────────────────────────────────────────

  console.log("\nVerification query:\n");

  const { data, error: verifyError } = await supabaseAdmin
    .from("supplier_offerings")
    .select("company_name, status, priority, certifications, tags")
    .in(
      "company_name",
      suppliers.map((s) => s.company_name)
    )
    .order("priority", { ascending: false });

  if (verifyError) {
    console.error("Verification query failed:", verifyError.message);
    return;
  }

  const rows = (
    data as {
      company_name: string;
      status: string;
      priority: number;
      certifications: string[] | null;
      tags: string[] | null;
    }[]
  ) ?? [];

  const colWidths = {
    company_name: 30,
    status: 10,
    priority: 8,
    cert_count: 10,
    tag_count: 9,
  };

  const pad = (s: string | number, w: number) => String(s).padEnd(w);

  console.log(
    pad("company_name", colWidths.company_name) +
      pad("status", colWidths.status) +
      pad("priority", colWidths.priority) +
      pad("cert_count", colWidths.cert_count) +
      pad("tag_count", colWidths.tag_count)
  );
  console.log("─".repeat(
    colWidths.company_name + colWidths.status + colWidths.priority +
    colWidths.cert_count + colWidths.tag_count
  ));

  for (const row of rows) {
    console.log(
      pad(row.company_name, colWidths.company_name) +
        pad(row.status, colWidths.status) +
        pad(row.priority, colWidths.priority) +
        pad(row.certifications?.length ?? 0, colWidths.cert_count) +
        pad(row.tags?.length ?? 0, colWidths.tag_count)
    );
  }

  console.log(`\n${rows.length} row(s) returned.`);
}

seed().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
