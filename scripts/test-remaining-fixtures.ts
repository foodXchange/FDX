import "dotenv/config";
import extractImage from "@/lib/ai/extractImage";

const fixtures = [
  {
    name: "Vacuum veg",
    imageId: "a162fd0f-d71c-48f8-b58d-870f9e24d5d2",
    url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/veg.jpg.jpg",
  },
  {
    name: "Multi-product",
    imageId: "6127b218-4738-4465-b030-6994c3b9ea13",
    url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/fixtures/multi.jpg.webp",
  },
];

async function run() {
  for (const f of fixtures) {
    console.log(`\n--- ${f.name} ---`);
    const out = await extractImage({ imageUrl: f.url, imageId: f.imageId, dryRun: true });
    console.log(JSON.stringify(out, null, 2));
    if (f.name === "Multi-product") {
      const fired = out?.flags?.includes("multiple_products_in_frame");
      console.log(`\nmultiple_products_in_frame: ${fired ? "YES ✓" : "NO ✗"}`);
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
