/**
 * Background worker — polls MongoDB for pending indexing jobs.
 * Run: npm run worker
 */
import "../lib/load-env";
import { connectDB } from "../lib/db/mongodb";
import { processPendingJobs } from "../lib/services/job-worker";

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_MS ?? 3000);

async function runLoop() {
  await connectDB();
  console.log(`[worker] Started — polling every ${POLL_INTERVAL_MS}ms`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const processed = await processPendingJobs();
      if (processed > 0) {
        console.log(`[worker] Processed ${processed} job(s)`);
      }
    } catch (err) {
      console.error("[worker] Error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

runLoop().catch((err) => {
  console.error("[worker] Fatal:", err);
  process.exit(1);
});
