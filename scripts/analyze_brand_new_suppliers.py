import csv, sys, os, json, urllib.request
from collections import Counter

csv.field_size_limit(sys.maxsize)

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

print('Fetching existing suppliers from Supabase...')
offset = 0
limit = 1000
existing_domains = set()
existing_names = set()

while True:
    url = f'{supabase_url}/rest/v1/supplier_offerings?select=company_name,website_domain&limit={limit}&offset={offset}'
    req = urllib.request.Request(url, headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}'
    })
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if not data:
                break
            for row in data:
                if row.get('company_name'):
                    existing_names.add(row['company_name'].lower().strip())
                if row.get('website_domain'):
                    existing_domains.add(normalize_domain(row['website_domain']))
            offset += len(data)
            if len(data) < limit:
                break
    except Exception as e:
        print('Error fetching from Supabase:', e)
        break

print(f'Supabase baseline: {offset} suppliers ({len(existing_names)} unique names, {len(existing_domains)} domains).')

path = r'scripts\suppliers_29_7_2025.csv'
unique_new = {}

with open(path, mode='r', encoding='utf-8', errors='ignore') as f:
    reader = csv.reader(f)
    headers = next(reader)
    for row in reader:
        name = row[0].strip() if len(row) > 0 else ''
        web = row[3].strip() if len(row) > 3 else ''
        domain = normalize_domain(web)
        
        if domain and domain in existing_domains:
            continue
        if name.lower() in existing_names:
            continue
        if not name and not domain:
            continue

        key = domain if domain else name.lower()
        if key not in unique_new:
            unique_new[key] = {
                'company_name': name,
                'website_url': web,
                'website_domain': domain,
                'country': row[46].strip() if len(row) > 46 else '',
                'category_txt': row[5].strip() if len(row) > 5 else '',
                'description': row[4].strip() if len(row) > 4 else '',
                'email': row[7].strip() if len(row) > 7 else '',
                'phone': row[41].strip() if len(row) > 41 else '',
                'kosher': row[12].strip() if len(row) > 12 else '',
                'seaport': row[11].strip() if len(row) > 11 else '',
                'incoterms': row[22].strip() if len(row) > 22 else '',
                'source': row[44].strip() if len(row) > 44 else ''
            }

print(f'Total Unique Brand New Suppliers: {len(unique_new)}')

countries = Counter(s['country'] for s in unique_new.values() if s['country'])
print('\n=== Top 15 Countries among Brand New Suppliers ===')
for c, cnt in countries.most_common(15):
    print(f'  {c}: {cnt}')

thin_matches = {
    'Fish & Seafood (inc. Tuna)': 0,
    'Canned Foods': 0,
    'Tomato Products': 0,
    'Pasta & Grains': 0,
    'Pulses & Legumes': 0,
    'Spices & Herbs': 0
}

thin_keywords = {
    'Fish & Seafood (inc. Tuna)': ['tuna', 'fish', 'seafood', 'salmon', 'sardine', 'mackerel', 'anchov', 'pescado', 'poisson'],
    'Canned Foods': ['canned', 'conserve', 'preserve', 'conservas', 'tin', 'canning'],
    'Tomato Products': ['tomato', 'pomodoro', 'passata', 'tomate'],
    'Pasta & Grains': ['pasta', 'grain', 'rice', 'wheat', 'flour', 'couscous', 'spaghetti'],
    'Pulses & Legumes': ['pulse', 'legume', 'bean', 'chickpea', 'lentil', 'pea', 'frijol'],
    'Spices & Herbs': ['spice', 'herb', 'seasoning', 'pepper', 'oregano', 'paprika']
}

for s in unique_new.values():
    text = (s['company_name'] + ' ' + s['category_txt'] + ' ' + s['description']).lower()
    for cat, kws in thin_keywords.items():
        if any(kw in text for kw in kws):
            thin_matches[cat] += 1

print('\n=== Thin Category Supplier Matches in New List ===')
for cat, cnt in thin_matches.items():
    print(f'  {cat}: {cnt} suppliers')

# Save staged CSV of unique new suppliers
out_csv = r'scripts\staged_new_suppliers.csv'
fieldnames = ['company_name', 'website_url', 'website_domain', 'country', 'category_txt', 'description', 'email', 'phone', 'kosher', 'seaport', 'incoterms', 'source']
with open(out_csv, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for s in unique_new.values():
        writer.writerow(s)

print(f'\nStaged {len(unique_new)} new suppliers saved to {out_csv}')
