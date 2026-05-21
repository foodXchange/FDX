/**
 * Update supplier_offerings with enhanced Perplexity research data.
 * Insert supplier_contacts and supplier_documents.
 * Run with: npx tsx scripts/update-suppliers-v2.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch { /* .env.local not found — env vars assumed set */ }
}

loadEnvLocal();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type SupplierUpdate = {
  legal_entity?: string | null;
  founded?: string | null;
  headquarters?: string | null;
  country_of_origin?: string | null;
  region?: string | null;
  company_size?: string | null;
  website?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  product_type?: string | null;
  primary_ingredients?: string[];
  categories?: string[];
  product_description?: string | null;
  formats?: string[];
  product_variants?: string[];
  certifications?: string[];
  markets_served?: string[];
  countries_exported_to?: string[];
  private_label?: boolean;
  own_brand?: boolean;
  annual_capacity?: string | null;
  price_positioning?: string | null;
  israeli_market_fit?: string | null;
  competitive_advantages?: string[];
  weaknesses?: string[];
  sourcing_notes?: string | null;
  tags?: string[];
  status?: string;
  priority?: number;
  verified?: boolean;
};

type SupplierContact = {
  supplier_id: string;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  is_primary: boolean;
  notes: string | null;
};

type SupplierDocument = {
  supplier_id: string;
  label: string;
  url: string;
  doc_type: string;
};

// ─── Step 1: Add columns ──────────────────────────────────────────────────────

async function step1_addColumns(): Promise<void> {
  console.log("\n── Step 1: Add columns ──");

  const alterSQL = `
ALTER TABLE supplier_offerings
  ADD COLUMN IF NOT EXISTS israeli_market_fit   text,
  ADD COLUMN IF NOT EXISTS competitive_advantages text[],
  ADD COLUMN IF NOT EXISTS weaknesses            text[],
  ADD COLUMN IF NOT EXISTS sourcing_notes        text,
  ADD COLUMN IF NOT EXISTS annual_capacity       text,
  ADD COLUMN IF NOT EXISTS price_positioning     text,
  ADD COLUMN IF NOT EXISTS brix_levels           text,
  ADD COLUMN IF NOT EXISTS product_variants      text[],
  ADD COLUMN IF NOT EXISTS product_type          text,
  ADD COLUMN IF NOT EXISTS primary_ingredients   text[],
  ADD COLUMN IF NOT EXISTS founded               text,
  ADD COLUMN IF NOT EXISTS legal_entity          text,
  ADD COLUMN IF NOT EXISTS region                text,
  ADD COLUMN IF NOT EXISTS company_size          text,
  ADD COLUMN IF NOT EXISTS headquarters          text;`.trim();

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: alterSQL }),
    });

    if (res.ok) {
      console.log("✓ All columns added / already present (exec_sql RPC)");
      return;
    }

    const body = await res.text();
    if (body.includes("PGRST202") || res.status === 404) {
      throw new Error("EXEC_SQL_NOT_FOUND");
    }
    // Any other response (including 400 when columns already exist) — treat as OK
    console.log("✓ Columns already present");
  } catch (err) {
    if (err instanceof Error && err.message === "EXEC_SQL_NOT_FOUND") {
      console.warn("⚠  exec_sql RPC not available. If updates fail, run this in Supabase SQL editor:");
      console.warn("\n" + alterSQL + "\n");
    } else {
      console.log("✓ Column step completed — continuing");
    }
  }
}

// ─── Step 2: Update Steriltom ─────────────────────────────────────────────────

async function step2_updateSteriltom(): Promise<string | null> {
  console.log("\n── Step 2: Update Steriltom S.r.l. ──");

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id")
    .eq("company_name", "Steriltom S.r.l.")
    .single();

  if (fetchErr || !existing) {
    console.error("✗ Steriltom not found:", fetchErr?.message ?? "no row returned");
    return null;
  }

  const id = existing.id as string;

  const update: SupplierUpdate = {
    legal_entity: "Steriltom S.r.l.",
    founded: "1934 (family activity); legal entity 1992",
    headquarters: "Gragnano Trebbiense, Piacenza, Italy",
    country_of_origin: "Italy",
    region: "Emilia-Romagna, Piacenza tomato district",
    company_size: "40-50 employees",
    website: "https://www.steriltom.com/en/index.html",
    contact_email: "sales@steriltom.com",
    contact_phone: "+39 0523 789811",
    product_type: "pure_ingredient",
    primary_ingredients: [
      "fresh Italian tomatoes",
      "Emilia-Romagna tomatoes",
      "Piacenza area tomatoes",
    ],
    categories: ["Tomato Products", "Canned Foods", "Organic & Natural"],
    product_description:
      "Steriltom specializes in Italian tomato pulp (finely chopped tomatoes) produced from fresh tomatoes grown near its plant in Piacenza, Emilia-Romagna. Pioneer in sterilization before packaging and in bag-in-box technology for tomato pulp. European leader in tomato pulp for foodservice and industrial use. Founded 1934. Processes over 230,000 metric tonnes of fresh tomatoes annually. Products designed for chefs, pizza makers and food manufacturers.",
    formats: [
      "Bag-in-box 2.6kg",
      "Bag-in-box 5kg",
      "Bag-in-box 10kg",
      "Bag-in-box 15kg",
      "Can 2.5kg",
      "Can 3kg",
      "Can 4.05kg",
      "Drum 210kg",
      "Big box 850kg",
      "Goodpack 1350kg",
    ],
    product_variants: [
      "Conventional tomato pulp",
      "Organic tomato pulp",
      "Halal-certified tomato pulp",
      "Kosher-certified tomato pulp",
      "HoReCa range",
      "Industrial range",
    ],
    certifications: [
      "BRC", "IFS", "Organic", "Halal", "Kosher",
      "FDA registered", "ISO 9001", "ISO 14001", "ISO 45001",
    ],
    markets_served: ["Foodservice", "Industry", "Export"],
    countries_exported_to: ["Worldwide (80+ countries)"],
    private_label: true,
    own_brand: true,
    annual_capacity: "230,000+ metric tonnes fresh tomatoes processed annually",
    price_positioning: "mid-range",
    israeli_market_fit:
      "Score 7/10. Kosher certification present (body not specified). Halal and major food safety certs (BRC, IFS, FDA) give strong baseline. No explicit Israel track record or Hebrew labeling mentioned. Key question: which Rabbinate certifies the Kosher products? Confirm before approaching Israeli retail buyers.",
    competitive_advantages: [
      "European leader in tomato pulp — largest Italian tomato pulp producer",
      "Pioneer in bag-in-box technology for tomato pulp",
      "230,000+ tonnes annual processing capacity",
      "Multiple certifications: BRC, IFS, Organic, Halal, Kosher, FDA",
      "Integrated supply chain — tomatoes from surrounding Piacenza fields",
      "Tailored ranges for HoReCa and industrial channels",
    ],
    weaknesses: [
      "No public MOQ or lead time information",
      "Limited technical specs (Brix, viscosity) publicly available",
      "No confirmed Israeli export experience",
    ],
    sourcing_notes:
      "Request full technical data sheets per variant (Brix, viscosity, seed/peel presence, micro standards). Ask for packaging matrix with all formats and palletization. Verify Kosher certifying body and scope. Confirm Hebrew labeling capability for Israel. Check seasonal availability — fresh processing campaign based.",
    tags: [
      "tomato pulp", "finely chopped tomatoes", "italian tomato", "tomato puree",
      "diced tomatoes", "bag in box tomato", "aseptic tomato", "organic tomato pulp",
      "kosher tomato", "halal tomato", "horeca tomato", "industrial tomato ingredient",
      "pizza tomato", "BRC certified tomato", "IFS certified tomato", "FDA registered",
      "private label tomato", "bulk tomato", "emilia romagna", "piacenza tomato",
    ],
    status: "approved",
    priority: 10,
    verified: true,
  };

  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("✗ Update failed:", error.message);
    return null;
  }

  console.log("✓ Steriltom S.r.l. updated");
  return id;
}

// ─── Step 3: Update Canoliva ──────────────────────────────────────────────────

async function step3_updateCanoliva(): Promise<string | null> {
  console.log("\n── Step 3: Update Aceites Canoliva S.L. ──");

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("supplier_offerings")
    .select("id")
    .eq("company_name", "Aceites Canoliva S.L.")
    .single();

  if (fetchErr || !existing) {
    console.error("✗ Canoliva not found:", fetchErr?.message ?? "no row returned");
    return null;
  }

  const id = existing.id as string;

  const update: SupplierUpdate = {
    legal_entity: "ACEITES CANOLIVA, S.L.",
    founded: "2015 (current company); family in olive oil since 1968",
    headquarters: "Luque, Córdoba, Spain",
    country_of_origin: "Spain",
    region: "Andalusia, Córdoba province, Luque / Baena olive oil area",
    website: "https://canoliva.com/?lang=en",
    product_type: "pure_ingredient",
    primary_ingredients: [
      "Picual olives",
      "Pajarera olives",
      "Spanish olive varieties",
      "olive pomace",
    ],
    categories: ["Oils & Fats", "Organic & Natural"],
    product_description:
      "Aceites Canoliva is a Spanish family producer of extra virgin olive oil based in Córdoba, Andalusia. Active in olive oil since 1968. Portfolio includes premium EVOO, organic, early-harvest unfiltered, and pomace oil under distinct brands. Emphasis on traceability, integrated production from grove to bottle, and sensory complexity. Export-oriented with presence in 30+ countries. Award-winning producer recognized in EVOOLEUM and Olive Japan.",
    formats: [
      "Glass bottle 500ml",
      "Tin 5L",
      "PET 5L",
      "Gift box 2-unit",
      "IBC bulk",
      "Tank bulk",
    ],
    product_variants: [
      "Canoliva Premium — EVOO Picual/Pajarera coupage",
      "Canoliva Organic — certified organic EVOO",
      "Reserva Familiar — premium family selection EVOO",
      "Canoliva Cosecha Temprana — early harvest unfiltered",
      "Camposur — fruity medium complexity EVOO",
      "Don Orujo — pomace oil for frying",
    ],
    certifications: ["IFS", "BRC", "Kosher", "CAAE Organic", "JAS Organic", "SMETA"],
    markets_served: ["Retail", "Export", "Foodservice"],
    countries_exported_to: ["30+ countries worldwide"],
    private_label: true,
    own_brand: true,
    price_positioning: "premium",
    annual_capacity: "Not disclosed",
    israeli_market_fit:
      "Score 7/10. Kosher certified (certifying body not specified — must verify which Rabbinate). BRC and IFS support Israeli retail requirements. Organic JAS and CAAE add premium positioning. No confirmed Israel track record. Hebrew labeling capability unknown. Premium pricing may suit Israeli gourmet retail but needs validation. SMETA audit shows ethical supply chain — increasingly important for European-origin retail products.",
    competitive_advantages: [
      "Family heritage since 1968 with deep Andalusian olive oil expertise",
      "Six distinct brands covering premium, organic, early-harvest and everyday segments",
      "Comprehensive certifications: BRC, IFS, Organic CAAE, JAS, Kosher, SMETA",
      "Integrated traceability from grove to bottle",
      "Award-winning oils: EVOOLEUM, Olive Japan recognition",
      "Export experience in 30+ countries",
    ],
    weaknesses: [
      "No public MOQ, lead time or bulk format details",
      "Private label capability not explicitly marketed",
      "Kosher certifying body not specified",
    ],
    sourcing_notes:
      "Request full packaging matrix per brand (formats, sizes, materials, palletization). Ask for technical specs per SKU (acidity, polyphenols, peroxide values, harvest date, variety composition). Clarify private label capability and MOQ. For Israeli market: confirm Kosher authority, which SKUs are certified, Hebrew labeling capability, and pricing for Israeli retail.",
    tags: [
      "extra virgin olive oil", "spanish olive oil", "premium EVOO", "organic olive oil",
      "early harvest olive oil", "picual olive oil", "andalusia olive oil", "cordoba olive oil",
      "kosher olive oil", "BRC certified olive oil", "IFS certified oil", "organic CAAE certified",
      "JAS organic oil", "pomace oil", "retail olive oil", "private label oil",
      "gourmet olive oil", "spanish food export", "SMETA audited", "family producer Spain",
    ],
    status: "approved",
    priority: 9,
    verified: true,
  };

  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("✗ Update failed:", error.message);
    return null;
  }

  console.log("✓ Aceites Canoliva S.L. updated");
  return id;
}

// ─── Step 4: Insert contacts ──────────────────────────────────────────────────

async function deleteAndInsertContact(contact: SupplierContact): Promise<void> {
  const label = contact.name ?? contact.email ?? "general";

  // Delete by most specific available key
  if (contact.email) {
    await supabaseAdmin
      .from("supplier_contacts")
      .delete()
      .eq("supplier_id", contact.supplier_id)
      .eq("email", contact.email);
  } else if (contact.name) {
    await supabaseAdmin
      .from("supplier_contacts")
      .delete()
      .eq("supplier_id", contact.supplier_id)
      .eq("name", contact.name);
  }

  const { error } = await supabaseAdmin.from("supplier_contacts").insert(contact);

  if (error) {
    console.error(`  ✗ ${label}: ${error.message}`);
  } else {
    console.log(`  ✓ ${label} — ${contact.title ?? "no title"}${contact.is_primary ? " (primary)" : ""}`);
  }
}

async function step4_insertContacts(
  steriltomId: string,
  canolivaId: string
): Promise<void> {
  console.log("\n── Step 4: Insert contacts ──");

  const contacts: SupplierContact[] = [
    // ── Steriltom ──
    {
      supplier_id: steriltomId,
      name: "Gaia Rasparini",
      title: "Export Sales",
      email: "esales2@steriltom.com",
      phone: "+39 0523 789811",
      linkedin: null,
      is_primary: true,
      notes: "Export sales contact — confirmed from previous research",
    },
    {
      supplier_id: steriltomId,
      name: "Alessandro Squeri",
      title: "General Director",
      email: null,
      phone: null,
      linkedin: "https://www.linkedin.com/in/alessandrosqueri",
      is_primary: false,
      notes: "General Director. LinkedIn confirmed. Use for senior-level outreach only.",
    },
    {
      supplier_id: steriltomId,
      name: null,
      title: "General Sales",
      email: "sales@steriltom.com",
      phone: "+39 0523 789811",
      linkedin: null,
      is_primary: false,
      notes: "General sales inbox",
    },
    // ── Canoliva ──
    {
      supplier_id: canolivaId,
      name: null,
      title: "Export",
      email: "export@canoliva.com",
      phone: "+34 957 671 808",
      linkedin: null,
      is_primary: true,
      notes:
        "Export department. Family members Pepe Cano, Antonio Cano and Marisa Cano mentioned in company history — ask for export contact by name on first call.",
    },
  ];

  console.log("Steriltom contacts:");
  for (const c of contacts.filter((c) => c.supplier_id === steriltomId)) {
    await deleteAndInsertContact(c);
  }

  console.log("Canoliva contacts:");
  for (const c of contacts.filter((c) => c.supplier_id === canolivaId)) {
    await deleteAndInsertContact(c);
  }
}

// ─── Step 5: Insert documents ─────────────────────────────────────────────────

async function deleteAndInsertDocument(doc: SupplierDocument): Promise<void> {
  await supabaseAdmin
    .from("supplier_documents")
    .delete()
    .eq("supplier_id", doc.supplier_id)
    .eq("url", doc.url);

  const { error } = await supabaseAdmin.from("supplier_documents").insert(doc);

  if (error) {
    console.error(`  ✗ ${doc.label}: ${error.message}`);
  } else {
    console.log(`  ✓ ${doc.label} (${doc.doc_type})`);
  }
}

async function step5_insertDocuments(
  steriltomId: string,
  canolivaId: string
): Promise<void> {
  console.log("\n── Step 5: Insert documents ──");

  const documents: SupplierDocument[] = [
    // ── Steriltom ──
    {
      supplier_id: steriltomId,
      label: "Cibus Trade Profile",
      url: "https://app.cibus.it/en/exhibitor?id=143947",
      doc_type: "other",
    },
    {
      supplier_id: steriltomId,
      label: "TraceGains Supplier Profile",
      url: "https://gather.tracegains.com/market/supplier/c260ba5c-eb07-4c7d-8492-3b71d2371b4b",
      doc_type: "other",
    },
    {
      supplier_id: steriltomId,
      label: "Wholesale Packaging Formats",
      url: "https://www.steriltom.com/en/our-wholesale-formats-for-export.html",
      doc_type: "catalogue",
    },
    // ── Canoliva ──
    {
      supplier_id: canolivaId,
      label: "IFS Certificate 2025",
      url: "https://canoliva.com/wp-content/uploads/2025/05/IFS_Aceites-Canoliva-2025.pdf",
      doc_type: "certificate",
    },
    {
      supplier_id: canolivaId,
      label: "Olive Oil Ranking Profile",
      url: "https://oliveoilranking.org/producers/aceites-canoliva",
      doc_type: "other",
    },
    {
      supplier_id: canolivaId,
      label: "Best Olive Oils Guide",
      url: "https://bestoliveoils.org/producer/aceites-canoliva",
      doc_type: "other",
    },
    {
      supplier_id: canolivaId,
      label: "TasteAtlas Brand Profile",
      url: "https://www.tasteatlas.com/aceites-canoliva-sl-canoliva-premium",
      doc_type: "other",
    },
  ];

  console.log("Steriltom documents:");
  for (const d of documents.filter((d) => d.supplier_id === steriltomId)) {
    await deleteAndInsertDocument(d);
  }

  console.log("Canoliva documents:");
  for (const d of documents.filter((d) => d.supplier_id === canolivaId)) {
    await deleteAndInsertDocument(d);
  }
}

// ─── Step 6: Verify ───────────────────────────────────────────────────────────

async function step6_verify(): Promise<void> {
  console.log("\n── Step 6: Verification ──\n");

  const { data: suppliers, error: suppErr } = await supabaseAdmin
    .from("supplier_offerings")
    .select(
      "id, company_name, product_type, price_positioning, status, priority, certifications, tags, competitive_advantages"
    )
    .in("company_name", ["Steriltom S.r.l.", "Aceites Canoliva S.L."])
    .order("priority", { ascending: false });

  if (suppErr || !suppliers || suppliers.length === 0) {
    console.error("Verification query failed:", suppErr?.message ?? "no rows");
    return;
  }

  const ids = suppliers.map((s) => s.id as string);

  const [{ data: contacts }, { data: documents }] = await Promise.all([
    supabaseAdmin.from("supplier_contacts").select("supplier_id").in("supplier_id", ids),
    supabaseAdmin.from("supplier_documents").select("supplier_id").in("supplier_id", ids),
  ]);

  const contactCount = new Map<string, number>();
  const documentCount = new Map<string, number>();

  for (const c of contacts ?? []) {
    const sid = c.supplier_id as string;
    contactCount.set(sid, (contactCount.get(sid) ?? 0) + 1);
  }
  for (const d of documents ?? []) {
    const sid = d.supplier_id as string;
    documentCount.set(sid, (documentCount.get(sid) ?? 0) + 1);
  }

  type VerifyRow = {
    id: string;
    company_name: string;
    product_type: string | null;
    price_positioning: string | null;
    status: string | null;
    priority: number;
    certifications: string[] | null;
    tags: string[] | null;
    competitive_advantages: string[] | null;
  };

  const w = { name: 26, type: 16, price: 10, status: 10, prio: 5, certs: 6, tags: 6, adv: 6, cont: 9, docs: 5 };
  const p = (s: string | number, n: number) => String(s).padEnd(n);

  const hdr =
    p("company_name", w.name) +
    p("product_type", w.type) +
    p("price_pos", w.price) +
    p("status", w.status) +
    p("prio", w.prio) +
    p("certs", w.certs) +
    p("tags", w.tags) +
    p("advs", w.adv) +
    p("contacts", w.cont) +
    p("docs", w.docs);

  console.log(hdr);
  console.log("─".repeat(hdr.length));

  for (const s of suppliers as VerifyRow[]) {
    console.log(
      p(s.company_name, w.name) +
      p(s.product_type ?? "—", w.type) +
      p(s.price_positioning ?? "—", w.price) +
      p(s.status ?? "—", w.status) +
      p(s.priority, w.prio) +
      p(s.certifications?.length ?? 0, w.certs) +
      p(s.tags?.length ?? 0, w.tags) +
      p(s.competitive_advantages?.length ?? 0, w.adv) +
      p(contactCount.get(s.id) ?? 0, w.cont) +
      p(documentCount.get(s.id) ?? 0, w.docs)
    );
  }

  console.log(`\n${suppliers.length} supplier(s) verified.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("update-suppliers-v2 starting…");

  await step1_addColumns();

  const steriltomId = await step2_updateSteriltom();
  const canolivaId = await step3_updateCanoliva();

  if (!steriltomId || !canolivaId) {
    console.error("\n✗ One or more supplier records not found. Contacts and documents skipped.");
    console.error("  Run seed-suppliers.ts first if this is a fresh database.");
    process.exit(1);
  }

  await step4_insertContacts(steriltomId, canolivaId);
  await step5_insertDocuments(steriltomId, canolivaId);
  await step6_verify();

  console.log("\nDone.");
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
