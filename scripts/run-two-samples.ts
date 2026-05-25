import "dotenv/config";
import extractImage from "@/lib/ai/extractImage";

async function run() {
  const samples = [
    {
      name: "Meshek Achiya olive oil 750ml",
      url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/1779649953704-dh0ckiv3xec.webp",
    },
    {
      name: "Jahshan olive oil",
      url: "https://orzfgccllmkmhzkfswha.supabase.co/storage/v1/object/public/requests/1779649961850-l4z4folcu1l.jpg",
    },
  ];

  for (const s of samples) {
    console.log(`\n--- ${s.name} ---`);
    const out = await extractImage({ imageUrl: s.url, dryRun: true });
    console.log(JSON.stringify(out, null, 2));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
