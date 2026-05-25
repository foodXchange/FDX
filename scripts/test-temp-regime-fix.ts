import "dotenv/config";
import extractImage from "@/lib/ai/extractImage";

const fixtures = [
  {
    name: "Garlic (expect: chilled)",
    imageId: "f2038cee-bf90-4e1f-9c0f-ea2c1388e0eb",
    url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/1779704385123-fixture-garlic.jpg",
    expect: "chilled",
  },
  {
    name: "Granola (expect: ambient)",
    imageId: "84c47d11-a121-4fe1-8bcc-faedb747ab11",
    url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/1779704388528-fixture-granola.png",
    expect: "ambient",
  },
];

async function run() {
  let allPass = true;
  for (const f of fixtures) {
    const out = await extractImage({ imageUrl: f.url, imageId: f.imageId, dryRun: true });
    const got = out?.temperature_regime?.value;
    const pass = got === f.expect;
    if (!pass) allPass = false;
    console.log(`\n--- ${f.name} ---`);
    console.log(`temperature_regime: ${JSON.stringify(out?.temperature_regime)}`);
    console.log(`RESULT: ${pass ? "PASS ✓" : `FAIL ✗  (got "${got}", expected "${f.expect}")`}`);
  }
  console.log(`\n=== Overall: ${allPass ? "PASS ✓" : "FAIL ✗"} ===`);
}

run().catch((e) => { console.error(e); process.exit(1); });
