/**
 * seed-fixtures.ts
 * Run from your project root:
 *   npx tsx scripts/seed-fixtures.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'
import { Buffer } from 'buffer'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

const FIXTURES = [
  // ── Spot-check trio ────────────────────────────────────────────────────
  {
    fixture:     'garlic-spot-check',
    description: 'Peeled garlic retail jar — Phase 2 spot-check',
    images: [
      {
        label:    'garlic',
        url:      'https://www.purveyd.com/cdn/shop/products/PEELED-GARLIC-5LB-JAR.jpg?v=1651944718',
        filename: 'fixture-garlic.jpg',
        mime:     'image/jpeg',
      },
    ],
  },
  {
    fixture:     'granola-spot-check',
    description: 'Organic granola stand-up pouch — Phase 2 spot-check',
    images: [
      {
        label:    'granola',
        url:      'https://innnes.is/media/girosuu0/crispy-food-organic-classic-crunch-6x375g-73986-1778206049.png',
        filename: 'fixture-granola.png',
        mime:     'image/png',
      },
    ],
  },
  {
    fixture:     'vacuum-veg-spot-check',
    description: 'Vacuum-packed vegetables — Phase 2 spot-check',
    images: [
      {
        label:    'vacuum-veg',
        url:      'https://d2lnr5mha7bycj.cloudfront.net/product-image/file/large_ab368ce2-8280-41ed-ae2a-22e8b1f0c884.png',
        filename: 'fixture-vacuum-veg.png',
        mime:     'image/png',
      },
    ],
  },
  // ── Two-sizes fixture (most critical for Phase 3) ──────────────────────
  // Uses the two olive oil images already in request_images as reference;
  // add Mueloliva 500ml + 750ml below once you have those URLs.
  // Placeholder: Amazon olive oil as stand-in — REPLACE with Mueloliva URLs.
  {
    fixture:     'two-sizes-olive-oil',
    description: 'Same product two sizes — Phase 3 grouping collapse test',
    images: [
      {
        label:    'olive-oil-size-A',
        url:      'https://m.media-amazon.com/images/I/51DrTrXMA0L.jpg',
        filename: 'fixture-olive-oil-size-a.jpg',
        mime:     'image/jpeg',
      },
      {
        label:    'olive-oil-size-B',
        // REPLACE this URL with Mueloliva 750ml or another size variant
        url:      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThyVl7q5VRHgtO6X7JldapYnuV6fhxW0JtOw&s',
        filename: 'fixture-olive-oil-size-b.jpg',
        mime:     'image/jpeg',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchBuffer(res.headers.location!).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end',  () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function randomId(): string {
  return crypto.randomUUID()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const registry: Record<string, { request_id: string; images: { image_id: string; label: string; url: string }[] }> = {}

  for (const fixture of FIXTURES) {
    console.log(`\n── ${fixture.fixture} ──`)

    // 1. Create sourcing_request
    const requestId = randomId()
    const { error: reqErr } = await supabase
      .from('sourcing_requests')
      .insert({ id: requestId, source: 'fixture', internal_notes: fixture.description })

    if (reqErr) { console.error('  request insert failed:', reqErr.message); continue }
    console.log(`  sourcing_request: ${requestId}`)

    // 2. Create pip for this request
    const { error: pipErr } = await supabase
      .from('pips')
      .insert({
        sourcing_request_id: requestId,
        pip_version:         2,
        status:              'needs_review',
        created_from:        'image',
        data_json:           {},
      })

    if (pipErr) console.warn('  pip insert warning:', pipErr.message)

    registry[fixture.fixture] = { request_id: requestId, images: [] }

    // 3. For each image: download → upload to storage → insert request_images row
    for (const img of fixture.images) {
      process.stdout.write(`  downloading ${img.label}... `)

      let buffer: Buffer
      try {
        buffer = await fetchBuffer(img.url)
        console.log(`${buffer.length} bytes`)
      } catch (e: any) {
        console.error(`FAILED: ${e.message}`)
        console.log(`  → Skipping ${img.label}. Upload manually and insert a request_images row pointing to request ${requestId}.`)
        continue
      }

      // Upload to Supabase storage
      const storagePath = `fixtures/${Date.now()}-${img.filename}`
      const { error: uploadErr } = await supabase.storage
        .from('requests')
        .upload(storagePath, buffer, { contentType: img.mime, upsert: false })

      if (uploadErr) { console.error(`  storage upload failed: ${uploadErr.message}`); continue }

      const { data: { publicUrl } } = supabase.storage
        .from('requests')
        .getPublicUrl(storagePath)

      // Insert request_images row
      const imageId = randomId()
      const { error: imgErr } = await supabase
        .from('request_images')
        .insert({
          id:         imageId,
          request_id: requestId,
          url:        publicUrl,
          filename:   img.filename,
          mime_type:  img.mime,
          size_bytes: buffer.length,
        })

      if (imgErr) { console.error(`  image row insert failed: ${imgErr.message}`); continue }

      console.log(`  request_images row: ${imageId} → ${publicUrl}`)
      registry[fixture.fixture].images.push({ image_id: imageId, label: img.label, url: publicUrl })
    }
  }

  // ---------------------------------------------------------------------------
  // Print registry — paste back to Claude for confirmation
  // ---------------------------------------------------------------------------
  console.log('\n\n════════════════════════════════════════')
  console.log('FIXTURE REGISTRY — paste this back to Claude')
  console.log('════════════════════════════════════════')
  console.log(JSON.stringify(registry, null, 2))

  // Also emit verification SQL
  console.log('\n-- Verification query:')
  console.log(`SELECT ri.id AS image_id, ri.request_id, ri.url, ri.filename
FROM request_images ri
WHERE ri.request_id IN (${
  Object.values(registry).map(r => `'${r.request_id}'`).join(', ')
})
ORDER BY ri.request_id, ri.created_at;`)
}

main().catch(console.error)