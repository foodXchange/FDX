import csv, sys, os, json, urllib.request, time

csv.field_size_limit(sys.maxsize)

supabase_url = ''
supabase_key = ''
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip()
        elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            supabase_key = line.split('=', 1)[1].strip()

staged_csv = r'scripts\staged_new_suppliers.csv'
if not os.path.exists(staged_csv):
    print('Staged CSV not found!')
    sys.exit(1)

# Helper to normalize category
def parse_categories(cat_txt):
    if not cat_txt:
        return []
    # Split by comma or slash
    parts = [p.strip() for p in cat_txt.replace('/', ',').split(',') if p.strip()]
    # Deduplicate while preserving order
    seen = set()
    res = []
    for p in parts:
        p_clean = p.strip()
        if p_clean and p_clean.lower() not in seen and p_clean.lower() != 'n/a':
            seen.add(p_clean.lower())
            res.append(p_clean)
    return res[:5]

records = []
with open(staged_csv, mode='r', encoding='utf-8', errors='ignore') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row['company_name'].strip()
        domain = row['website_domain'].strip()
        if not name and not domain:
            continue
        
        cats = parse_categories(row.get('category_txt', ''))
        kosher = [k.strip() for k in row.get('kosher', '').split(',') if k.strip()]
        
        record = {
            'company_name': name if name else domain,
            'website': row.get('website_url', '').strip(),
            'website_domain': domain,
            'country_of_origin': row.get('country', '').strip() or None,
            'contact_email': row.get('email', '').strip() or None,
            'contact_phone': row.get('phone', '').strip() or None,
            'product_description': row.get('description', '').strip() or None,
            'categories': cats if cats else None,
            'kosher_types': kosher if kosher else None,
            'csv_import_batch': 'gdrive_suppliers_29_7_2025',
            'scrape_status': 'pending',
            'status': 'approved',
            'source': 'Suppliers 29_7_2025 Google Drive'
        }
        records.append(record)

print(f'Prepared {len(records)} supplier records for ingestion.')

CHUNK_SIZE = 250
total_inserted = 0
failed_chunks = 0

url = f'{supabase_url}/rest/v1/supplier_offerings'

start_time = time.time()
for i in range(0, len(records), CHUNK_SIZE):
    chunk = records[i:i + CHUNK_SIZE]
    payload = json.dumps(chunk).encode('utf-8')
    
    req = urllib.request.Request(url, data=payload, method='POST', headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    })
    
    try:
        with urllib.request.urlopen(req) as resp:
            total_inserted += len(chunk)
            pct = (total_inserted / len(records)) * 100
            print(f'Inserted batch {i//CHUNK_SIZE + 1} ({len(chunk)} rows) -> Total: {total_inserted}/{len(records)} ({pct:.1f}%)')
    except Exception as e:
        failed_chunks += 1
        print(f'Error inserting batch {i//CHUNK_SIZE + 1}: {e}')
        # Try inserting one by one in failed chunk to isolate offending row
        for item in chunk:
            item_req = urllib.request.Request(url, data=json.dumps(item).encode('utf-8'), method='POST', headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            })
            try:
                with urllib.request.urlopen(item_req):
                    total_inserted += 1
            except Exception as single_e:
                pass

elapsed = time.time() - start_time
print(f'\nIngestion completed in {elapsed:.1f}s!')
print(f'Successfully inserted: {total_inserted} brand new suppliers')
print(f'Batch tag: gdrive_suppliers_29_7_2025')
