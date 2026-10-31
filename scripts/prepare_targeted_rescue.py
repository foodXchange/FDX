import csv, urllib.request, json, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

supabase_url = ''
supabase_key = ''
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip()
        elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            supabase_key = line.split('=', 1)[1].strip()

def normalize_domain(url):
    if not url: return ''
    d = url.lower().strip()
    for prefix in ['https://', 'http://', 'www.']:
        if d.startswith(prefix):
            d = d[len(prefix):]
    return d.split('/')[0].split('?')[0].strip()

# 1. Load all suppliers to match by domain and name
offset = 0
limit = 1000
by_domain = {}
by_name = {}

while True:
    url = f'{supabase_url}/rest/v1/supplier_offerings?select=id,company_name,website,website_domain,scrape_status&limit={limit}&offset={offset}'
    req = urllib.request.Request(url, headers={'apikey': supabase_key, 'Authorization': f'Bearer {supabase_key}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if not data: break
            for r in data:
                if r.get('company_name'):
                    by_name[r['company_name'].lower().strip()] = r
                if r.get('website_domain'):
                    d = normalize_domain(r['website_domain'])
                    if d: by_domain[d] = r
            offset += len(data)
            if len(data) < limit: break
    except Exception as e:
        print('Error fetching:', e)
        break

print(f'Total suppliers cached: {offset}')

# 2. Identify 17 Beetroot factories needing rescue
beetroot_targets = []
with open('scripts/downloads/beetroot_recommendations.csv', 'r', encoding='utf-8', errors='replace') as f:
    for r in csv.DictReader(f):
        name = r['Name of Factory'].strip()
        email = r['Recommended Contact Email'].strip()
        domain = normalize_domain(email.split('@')[1]) if '@' in email else ''
        match = by_domain.get(domain) or by_name.get(name.lower())
        if match:
            # We want to rescue all 17 that are pending or failed, or even force refresh
            beetroot_targets.append((match, domain))

print(f'\nFound {len(beetroot_targets)} Beetroot factories to tag for rescue.')

# 3. Identify 6 Tuna factories needing rescue
tuna_targets = []
tuna_names_needed = ['Pastene (Div 2)', 'Kaptanoglu Seafood', 'Group Sagun', 'Porthos', 'Hora Gıda', 'Frigo Food S.A.']
with open('scripts/downloads/tuna_directory.csv', 'r', encoding='utf-8', errors='replace') as f:
    for r in csv.DictReader(f):
        name = r['Company Name'].strip()
        web = r['Website'].strip()
        domain = normalize_domain(web)
        match = by_domain.get(domain) or by_name.get(name.lower())
        if match and any(n.lower() in match['company_name'].lower() for n in tuna_names_needed):
            tuna_targets.append((match, domain))

print(f'Found {len(tuna_targets)} Tuna factories to tag for rescue.')

# 4. Update Supabase rows with batch tag 'beetroot_tuna_rescue'
tagged_count = 0
for match, domain in beetroot_targets + tuna_targets:
    sid = match['id']
    website_val = match.get('website') or f'https://{domain}'
    patch_url = f'{supabase_url}/rest/v1/supplier_offerings?id=eq.{sid}'
    body = json.dumps({
        'csv_import_batch': 'beetroot_tuna_rescue',
        'scrape_status': 'pending',
        'website': website_val,
        'website_domain': domain
    }).encode('utf-8')
    req = urllib.request.Request(patch_url, data=body, method='PATCH', headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    })
    try:
        with urllib.request.urlopen(req) as resp:
            tagged_count += 1
            print(f"  Tagged {match['company_name']} -> beetroot_tuna_rescue")
    except Exception as e:
        print(f"  Error updating {sid}: {e}")

# 5. Insert Conservas Garavilla
garavilla_data = {
    'company_name': 'Conservas Garavilla',
    'website': 'https://garavilla.com',
    'website_domain': 'garavilla.com',
    'country_of_origin': 'Spain',
    'contact_email': 'export@garavilla.com',
    'categories': ['Fish & Seafood', 'Canned Foods'],
    'product_subcategory': 'Tuna Canning',
    'csv_import_batch': 'beetroot_tuna_rescue',
    'scrape_status': 'pending',
    'offerings_summary': 'Direct cannery owner (BRC/IFS certified PL tuna producer)',
    'verified': True
}
insert_url = f'{supabase_url}/rest/v1/supplier_offerings'
req = urllib.request.Request(insert_url, data=json.dumps(garavilla_data).encode('utf-8'), method='POST', headers={
    'apikey': supabase_key,
    'Authorization': f'Bearer {supabase_key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
})
try:
    with urllib.request.urlopen(req) as resp:
        print('  Inserted Conservas Garavilla into supplier_offerings!')
except Exception as e:
    print('  Error inserting Conservas Garavilla:', e)

print(f'\nTotal {tagged_count + 1} targeted factories ready under batch "beetroot_tuna_rescue"!')
