import "dotenv/config";
import extractImage from "@/lib/ai/extractImage";

// A supermarket-shelf photo that clearly contains multiple distinct food products.
// This fixture exists solely to verify that the multiple_products_in_frame flag fires.
const MULTI_PRODUCT_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Supermarkt.jpg/1280px-Supermarkt.jpg";

async function run() {
  console.log("--- multi-product fixture ---");
  const out = await extractImage({ imageUrl: MULTI_PRODUCT_URL, dryRun: true });
  console.log(JSON.stringify(out, null, 2));
  const fired = out?.flags?.includes("multiple_products_in_frame");
  console.log(`\nmultiple_products_in_frame flag fired: ${fired ? "YES ✓" : "NO ✗"}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
