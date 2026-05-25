import "dotenv/config";
import extractImage from "@/lib/ai/extractImage";

const fixtures = [
  {
    name: "Garlic",
    imageId: "f2038cee-bf90-4e1f-9c0f-ea2c1388e0eb",
    url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/1779704385123-fixture-garlic.jpg",
  },
  {
    name: "Granola",
    imageId: "84c47d11-a121-4fe1-8bcc-faedb747ab11",
    url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/1779704388528-fixture-granola.png",
  },
  {
    name: "Vacuum veg",
    imageId: "a162fd0f-d71c-48f8-b58d-870f9e24d5d2",
    url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/1779704391554-fixture-vacuum-veg.png",
  },
];

async function run() {
  for (const f of fixtures) {
    console.log(`\n--- ${f.name} ---`);
    const out = await extractImage({ imageUrl: f.url, imageId: f.imageId, dryRun: true });
    console.log(JSON.stringify(out, null, 2));
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
