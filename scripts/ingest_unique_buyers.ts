/**
 * Ingest AI Optimized Buyers from Google Drive with zero duplication.
 *
 * Source: g:\My Drive\Business intelligence\AI_OPTIMIZED_BUYERS_20250911_154343.csv
 * Target: buyer_companies table
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = 'g:\\My Drive\\Business intelligence\\AI_OPTIMIZED_BUYERS_20250911_154343.csv';

function cleanDomain(urlOrDomain: string | null | undefined): string {
  if (!urlOrDomain) return '';
  let d = urlOrDomain.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return d.split('/')[0].split(':')[0].trim();
}

function cleanName(name: string | null | undefined): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('🚀 Ingesting unique buyers from AI_OPTIMIZED_BUYERS...');
  
  if (!fs.existsSync(CSV_PATH)) {
    console.error('File not found:', CSV_PATH);
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch all existing buyer_companies to prevent any duplicates
  const { data: existingBuyers, error: fetchErr } = await supabase
    .from('buyer_companies')
    .select('id, company_name, website');

  if (fetchErr) {
    console.error('Error fetching existing buyers:', fetchErr);
    process.exit(1);
  }

  const existingDomains = new Set<string>();
  const existingNames = new Set<string>();

  for (const b of existingBuyers || []) {
    const dom = cleanDomain(b.website);
    if (dom) existingDomains.add(dom);
    const nm = cleanName(b.company_name);
    if (nm && nm.length >= 3) existingNames.add(nm);
  }

  console.log(`Existing in DB: ${existingBuyers?.length} buyers (${existingDomains.size} domains, ${existingNames.size} names)`);

  // 2. Read and parse CSV
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records: any[] = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Total records in CSV: ${records.length}`);

  const toInsert: any[] = [];
  let skippedDuplicates = 0;

  for (const row of records) {
    const companyName = (row.company_name || '').trim();
    const website = (row.website || '').trim();

    if (!companyName && !website) continue;

    const dom = cleanDomain(website);
    const nm = cleanName(companyName);

    if ((dom && existingDomains.has(dom)) || (nm && existingNames.has(nm))) {
      skippedDuplicates++;
      continue;
    }

    // Add to local sets to prevent intra-file duplicates
    if (dom) existingDomains.add(dom);
    if (nm) existingNames.add(nm);

    toInsert.push({
      company_name: companyName || dom,
      website: website || null,
      country: row.hq_country || null,
      city: row.hq_city || null,
      buyer_type: row.business_type || 'Retailer / Wholesaler',
      contact_name: row.primary_contact_name || null,
      contact_email: row.procurement_email || row.primary_contact_email || null,
      email: row.procurement_email || row.primary_contact_email || null,
      source: 'gdrive_ai_optimized_buyers_20250911',
      industry: row.food_focus || 'Food & Grocery',
      size: row.employee_count || row.store_count ? `${row.store_count || 0} stores` : null,
      description: row.about_company || null,
      active: true,
      notes: [
        row.purchasing_power_score ? `Purchasing Power: ${row.purchasing_power_score}/100` : null,
        row.product_categories ? `Categories: ${row.product_categories}` : null,
        row.certifications_required ? `Required Certs: ${row.certifications_required}` : null,
      ].filter(Boolean).join(' | ') || null,
    });
  }

  console.log(`Filtered: ${skippedDuplicates} duplicate records skipped.`);
  console.log(`Ready to insert: ${toInsert.length} brand new unique buyers.`);

  // 3. Batch insert in chunks of 100
  const CHUNK_SIZE = 100;
  let insertedCount = 0;

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const { error: insertErr } = await supabase.from('buyer_companies').insert(chunk);

    if (insertErr) {
      console.error(`Error inserting chunk ${i / CHUNK_SIZE + 1}:`, insertErr);
    } else {
      insertedCount += chunk.length;
      console.log(`Inserted ${insertedCount}/${toInsert.length} buyers...`);
    }
  }

  console.log(`\n✅ Ingestion complete! Successfully added ${insertedCount} new buyer companies with 0 duplicates.`);
}

main().catch(console.error);
