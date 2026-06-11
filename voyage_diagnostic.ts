import https from "https";
import dns from "dns/promises";

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || "";
const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";

async function testDNS() {
  console.log("\n--- 1. DNS Resolution ---");
  try {
    const result = await dns.lookup("api.voyageai.com");
    console.log("✅ DNS OK:", result);
  } catch (e) {
    console.error("❌ DNS FAILED:", e);
  }
}

async function testConnectivity() {
  console.log("\n--- 2. TCP Connectivity ---");
  return new Promise<void>((resolve) => {
    const req = https.request(
      { hostname: "api.voyageai.com", port: 443, path: "/", method: "HEAD", timeout: 5000 },
      (res) => {
        console.log("✅ TCP OK — HTTP status:", res.statusCode);
        resolve();
      }
    );
    req.on("error", (e) => {
      console.error("❌ TCP FAILED:", e.message);
      resolve();
    });
    req.on("timeout", () => {
      console.error("❌ TCP TIMEOUT");
      req.destroy();
      resolve();
    });
    req.end();
  });
}

async function testAPIKey() {
  console.log("\n--- 3. API Key Check ---");
  if (!VOYAGE_API_KEY) {
    console.error("❌ VOYAGE_API_KEY is empty or not set");
    return;
  }
  console.log("✅ Key present, prefix:", VOYAGE_API_KEY.slice(0, 8) + "...");
}

async function testSingleEmbedding() {
  console.log("\n--- 4. Single Embedding Request ---");
  if (!VOYAGE_API_KEY) {
    console.log("⏭ Skipped — no API key");
    return;
  }

  try {
    const res = await fetch(VOYAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "voyage-3",
        input: ["frozen peas 1kg"],
        input_type: "document",
      }),
      signal: AbortSignal.timeout(10000),
    });

    const body = await res.json();

    if (!res.ok) {
      console.error("❌ API error:", res.status, JSON.stringify(body));
      return;
    }

    const vec = body?.data?.[0]?.embedding;
    if (!vec) {
      console.error("❌ No embedding in response:", JSON.stringify(body));
      return;
    }

    console.log("✅ Embedding OK — dims:", vec.length, "| first 4 values:", vec.slice(0, 4));
  } catch (e: any) {
    console.error("❌ Fetch failed:", e.message || e);
  }
}

async function run() {
  console.log("=== Voyage AI Diagnostic ===");
  console.log("Time:", new Date().toISOString());
  await testDNS();
  await testConnectivity();
  await testAPIKey();
  await testSingleEmbedding();
  console.log("\n=== Done ===");
}

run();