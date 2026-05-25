import "dotenv/config";
import extractImage from "@/lib/ai/extractImage";

async function run() {
  const samples = [
    // vacuum-packed vegetables
    "https://upload.wikimedia.org/wikipedia/commons/6/60/Canned_beets.jpg",
    // organic granola (example pouch)
    "https://upload.wikimedia.org/wikipedia/commons/4/4d/Granola.jpg",
    // peeled garlic in jar (example)
    "https://upload.wikimedia.org/wikipedia/commons/3/3f/Garlic_in_jar.jpg",
  ];

  for (const url of samples) {
    console.log(`\n--- Testing: ${url}`);
    const out = await extractImage({ imageUrl: url, dryRun: true });
    console.dir(out, { depth: 5 });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
