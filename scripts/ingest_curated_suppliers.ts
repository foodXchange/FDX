/**
 * Ingest unique curated suppliers from:
 * 1. master_suppliers_database.json
 * 2. sunflower_vegetable_oil_producers.json
 *
 * Checks domains and names against existing supplier_offerings to prevent any duplicates.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const MASTER_JSON = 'g:\\My Drive\\Business intelligence\\master_suppliers_database.json';
const OILS_JSON = 'g:\\My Drive\\Business intelligence\\sunflower_vegetable_oil_producers.json';

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
  console.log('🚀 Loading database suppliers to build deduplication index...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Load existing suppliers from cached db lookup
  const cachedLookupPath = 'scripts/db_suppliers_lookup.json';
  let dbData: any[] = [];
  if (fs.existsSync(cachedLookupPath)) {
    dbData = JSON.parse(fs.readFileSync(cachedLookupPath, 'utf-8'));
  } else {
    const { data } = await supabase.from('supplier_offerings').select('company_name, website, website_domain');
    dbData = data || [];
  }

  const existingDomains = new Set<string>();
  const existingNames = new Set<string>();

  for (const r of dbData) {
    const dom = cleanDomain(r.website_domain || r.website);
    if (dom) existingDomains.add(dom);
    const nm = cleanName(r.company_name);
    if (nm && nm.length >= 3) existingNames.add(nm);
  }

  console.log(`Indexed ${existingDomains.size} domains and ${existingNames.size} company names.`);

  const toInsert: any[] = [];

  // 1. Process master_suppliers_database.json
  if (fs.existsSync(MASTER_JSON)) {
    const masterData = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf-8'));
    const suppliers = masterData.suppliers || [];
    console.log(`\nEvaluating ${suppliers.length} records in master_suppliers_database.json...`);

    for (const s of suppliers) {
      const name = (s.company || '').trim();
      const website = (s.contact?.website || '').trim();
      const dom = cleanDomain(website);
      const nm = cleanName(name);

      if ((dom && existingDomains.has(dom)) || (nm && existingNames.has(nm))) {
        continue;
      }

      if (dom) existingDomains.add(dom);
      if (nm) existingNames.add(nm);

      const certsObj = s.certifications || {};
      const certsList: string[] = [];
      if (certsObj.iso_22000) certsList.push('ISO 22000');
      if (certsObj.haccp) certsList.push('HACCP');
      if (certsObj.ifs) certsList.push('IFS');
      if (certsObj.brc) certsList.push('BRC');
      if (certsObj.fssc_22000) certsList.push('FSSC 22000');
      if (certsObj.organic) certsList.push('Organic');
      if (certsObj.halal) certsList.push('Halal');
      if (certsObj.general) certsList.push(...certsObj.general.split(';').map((c: string) => c.trim()));

      const kosherTypes = certsObj.kosher ? ['Kosher'] : [];

      toInsert.push({
        company_name: name || dom,
        website: website || null,
        website_domain: dom || null,
        country_of_origin: s.location?.country || null,
        contact_email: s.contact?.export_manager_email || s.contact?.email || null,
        contact_phone: s.contact?.export_manager_phone || s.contact?.phone || null,
        contact_name: s.contact?.export_manager_name || null,
        product_description: s.products?.product_types || null,
        categories: s.category ? [s.category] : null,
        certifications: certsList.length > 0 ? Array.from(new Set(certsList)) : null,
        kosher_types: kosherTypes.length > 0 ? kosherTypes : null,
        private_label: Boolean(s.capabilities?.private_label),
        status: 'approved',
        scrape_status: 'pending',
        csv_import_batch: 'gdrive_master_suppliers_db',
        source: 'Master Food Suppliers Database GDrive',
      });
    }
  }

  // 2. Process sunflower_vegetable_oil_producers.json
  if (fs.existsSync(OILS_JSON)) {
    const rawContent = fs.readFileSync(OILS_JSON, 'utf-8').replace(/:\s*NaN/g, ': null');
    const oilsData = JSON.parse(rawContent);
    const producers = oilsData.producers || [];
    console.log(`\nEvaluating ${producers.length} records in sunflower_vegetable_oil_producers.json...`);

    for (const p of producers) {
      const name = (p.company_info?.name || '').trim();
      const website = (p.company_info?.website || '').trim();
      const dom = cleanDomain(website);
      const nm = cleanName(name);

      if ((dom && existingDomains.has(dom)) || (nm && existingNames.has(nm))) {
        continue;
      }

      if (dom) existingDomains.add(dom);
      if (nm) existingNames.add(nm);

      const certsStr = p.certifications?.certifications || '';
      const certsList = certsStr ? certsStr.split(';').map((c: string) => c.trim()).filter(Boolean) : [];
      const hasKosher = certsList.some((c: string) => c.toLowerCase().includes('kosher'));

      toInsert.push({
        company_name: name || dom,
        website: website || null,
        website_domain: dom || null,
        country_of_origin: p.company_info?.country || null,
        contact_email: p.contact_details?.export_email || p.contact_details?.export_contacts || null,
        contact_phone: p.contact_details?.phone || null,
        contact_name: p.contact_details?.export_manager || null,
        product_description: p.products?.product_types || 'Sunflower & vegetable oils',
        categories: ['Oils & Fats', 'Edible Oils'],
        certifications: certsList.length > 0 ? Array.from(new Set(certsList)) : null,
        kosher_types: hasKosher ? ['Kosher'] : null,
        annual_capacity: p.production_facilities?.capacity_mt_year || null,
        headquarters: p.company_info?.address || null,
        private_label: p.capabilities?.offers_private_label === 'Y',
        status: 'approved',
        scrape_status: 'pending',
        csv_import_batch: 'gdrive_sunflower_oil_producers',
        source: 'Sunflower & Vegetable Oil Producers GDrive',
      });
    }
  }

  console.log(`\nTotal verified brand new suppliers to insert: ${toInsert.length}`);

  // Insert in chunks of 100
  const CHUNK_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('supplier_offerings').insert(chunk);
    if (error) {
      console.error(`Error inserting chunk ${i / CHUNK_SIZE + 1}:`, error);
    } else {
      inserted += chunk.length;
      console.log(`Inserted ${inserted}/${toInsert.length} suppliers...`);
    }
  }

  console.log(`\n✅ Ingestion complete! Successfully added ${inserted} specialized new suppliers with ZERO duplicates.`);
}

main().catch(console.error);
