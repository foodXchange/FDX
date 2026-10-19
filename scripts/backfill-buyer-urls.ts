import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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
  } catch {}
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KNOWN_BUYER_DOMAINS: Record<string, string> = {
  "rami levy": "https://www.rami-levy.co.il/",
  "victory": "https://www.victoryonline.co.il/",
  "osher ad": "https://www.osherad.co.il/",
  "mazon kol (osher ad)": "https://www.osherad.co.il/",
  "yeinot bitan": "https://www.ybitan.co.il/",
  "diplomat": "https://www.diplomat.co.il",
  "diplomat distribution (1968) ltd.": "https://www.diplomat.co.il",
  "tnuva": "https://www.tnuva.co.il/",
  "strauss": "https://www.strauss-group.com/",
  "mega": "https://www.mega.co.il/",
  "am:pm": "https://www.ampm.co.il/",
  "keshet teamim": "https://www.keshet-teamim.co.il/",
  "shufersal": "https://www.shufersal.co.il/online/",
  "carrefour": "https://www.carrefour.co.il/",
  "yochananof": "https://yochananof.co.il/",
  "dor alon": "https://www.doralon.co.il/%D7%90%D7%9C%D7%95%D7%A0%D7%99%D7%AA/",
  "ta'aman": "https://taaman.co.il/",
  "harduf / all organic ltd": "https://www.harduf.co.il/",
  "leiman schlussel ltd": "https://www.l-s.co.il/",
  "fresco 2006 hazeva ltd.": "https://www.frescofarm.co.il/",
  "schestowitz": "https://www.sch.co.il/en/brands/",
  "achim cohen": "https://cohenb.com/",
  "h. cohen import marketing & logistics ltd": "https://www.h-cohen.co.il/",
  "chabad of israel": "https://www.chabad.org.il/",
  "ha'sade organic": "https://ha-sade.com/",
  "nany sauces": "https://www.nanysauces.com/",
  "tishbi winery": "https://www.tishbi.com/",
  "carmit- bakery goods": "https://carmit.com/",
  "mendelsohn's": "https://mendelsohns.com/",
  "mendelsohn’s": "https://mendelsohns.com/",
  "rak-marak": "https://rakmarak.co.il/",
  "super sapir": "https://sapir-group.co.il/",
  "unimarket ltd": "https://unimarket.co.il/",
};

async function main() {
  console.log("Starting Buyer URL Synchronization...");

  // 1. Fetch all buyers and buyer_companies
  const [buyersRes, bcRes] = await Promise.all([
    supabase.from("buyers").select("id, company_name, website"),
    supabase.from("buyer_companies").select("id, company_name, website"),
  ]);

  const buyers = buyersRes.data ?? [];
  const buyerCompanies = bcRes.data ?? [];

  const bcMap = new Map<string, string>();
  for (const bc of buyerCompanies) {
    if (bc.website && bc.website.trim()) {
      bcMap.set(bc.company_name.toLowerCase().trim(), bc.website.trim());
    }
  }

  let updatedCount = 0;
  for (const b of buyers) {
    const norm = b.company_name.toLowerCase().trim();
    let targetUrl = b.website?.trim() || null;

    if (!targetUrl || targetUrl === "NONE" || targetUrl === "") {
      targetUrl = KNOWN_BUYER_DOMAINS[norm] || bcMap.get(norm) || null;
    }

    if (targetUrl && targetUrl !== b.website) {
      const { error } = await supabase
        .from("buyers")
        .update({ website: targetUrl })
        .eq("id", b.id);

      if (error) {
        console.error(`Failed to update buyer ${b.company_name}:`, error.message);
      } else {
        console.log(`✓ Updated [buyers] ${b.company_name} => ${targetUrl}`);
        updatedCount++;
      }
    } else {
      console.log(`- [buyers] ${b.company_name} => ${b.website || "STILL EMPTY"}`);
    }
  }

  // 2. Also backfill buyer_companies
  let bcUpdatedCount = 0;
  for (const bc of buyerCompanies) {
    const norm = bc.company_name.toLowerCase().trim();
    if (!bc.website || bc.website === "NONE" || bc.website === "") {
      const known = KNOWN_BUYER_DOMAINS[norm];
      if (known) {
        const { error } = await supabase
          .from("buyer_companies")
          .update({ website: known })
          .eq("id", bc.id);
        if (!error) {
          console.log(`✓ Updated [buyer_companies] ${bc.company_name} => ${known}`);
          bcUpdatedCount++;
        }
      }
    }
  }

  console.log(`\nSynchronization finished. Updated ${updatedCount} buyers and ${bcUpdatedCount} buyer companies.`);
}

main().catch(console.error);
