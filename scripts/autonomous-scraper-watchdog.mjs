/**
 * Autonomous Scraper Watchdog & Supervisor
 * Ensures the Next.js scraper queue runs continuously until 100% of pending suppliers are scraped.
 *
 * Runs autonomously in the background:
 * - Polls /api/admin/scraper/queue every 20 seconds.
 * - Auto-restarts the queue if it ever stops while pending suppliers remain.
 * - Handles transient network errors and circuit breaker pauses safely.
 * - Terminates gracefully when totalPending reaches 0.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const POLL_INTERVAL_MS = 20_000;

async function fetchQueueState() {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/scraper/queue`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      console.warn(`[Watchdog] Queue status returned HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data?.state ?? null;
  } catch (err) {
    console.warn(`[Watchdog] Failed to connect to queue endpoint: ${err.message}`);
    return null;
  }
}

async function fetchStatusDetails() {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/scraper/status`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function startQueue() {
  try {
    console.log("[Watchdog] Sending START command to scraper queue...");
    const res = await fetch(`${BASE_URL}/api/admin/scraper/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const data = await res.json();
    console.log(`[Watchdog] Start response: ${data.message || JSON.stringify(data)}`);
    return data.ok;
  } catch (err) {
    console.error(`[Watchdog] Error triggering start: ${err.message}`);
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=================================================");
  console.log("🚀 FoodXchange Autonomous Scraper Watchdog Started");
  console.log(`Target: ${BASE_URL}/api/admin/scraper/queue`);
  console.log("=================================================");

  let consecutiveErrors = 0;
  let lastProcessedCount = -1;
  let stagnantCycles = 0;

  while (true) {
    await sleep(POLL_INTERVAL_MS);

    const state = await fetchQueueState();
    if (!state) {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        console.warn("[Watchdog] 5 consecutive failures reaching server. Waiting for dev server...");
      }
      continue;
    }
    consecutiveErrors = 0;

    const {
      isRunning,
      totalPending,
      processedCount,
      successCount,
      failedCount,
      skippedCount,
      productsFound,
      currentSupplier,
      lastMessage,
    } = state;

    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    console.log(
      `[${time}] Status: ${isRunning ? "ACTIVE" : "IDLE"} | Pending: ${totalPending} | Processed: ${processedCount} (Success: ${successCount}, Skipped: ${skippedCount}, Failed: ${failedCount}) | Products: ${productsFound} | Current: ${currentSupplier || "None"}`
    );

    // If completely finished
    if (totalPending === 0 && !isRunning) {
      console.log("\n=================================================");
      console.log("🎉 SUCCESS: All suppliers processed! Queue is complete.");
      console.log(`Total Products Extracted: ${productsFound}`);
      console.log("=================================================\n");
      break;
    }

    // Check circuit breaker if idle
    if (!isRunning && totalPending > 0) {
      const details = await fetchStatusDetails();
      if (details?.circuitBreaker?.isTripped) {
        console.warn(
          `[Watchdog] ⚡ Circuit breaker is tripped: ${details.circuitBreaker.reason}. Pausing 60s before recheck...`
        );
        await sleep(60_000);
        continue;
      }

      console.log(`[Watchdog] ⚠️ Queue is stopped but ${totalPending} suppliers remain pending. Auto-starting...`);
      await startQueue();
      await sleep(5_000);
    }
  }
}

main().catch((err) => {
  console.error("[Watchdog Fatal Error]:", err);
  process.exit(1);
});
