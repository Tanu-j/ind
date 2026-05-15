import { processPendingJobs } from "@/lib/services/job-worker";

const BATCH_SIZE = 10;

/**
 * Process queued jobs until the queue is empty or maxRounds is reached.
 */
export async function drainPendingJobs(maxRounds = 100): Promise<number> {
  let total = 0;
  for (let i = 0; i < maxRounds; i++) {
    const processed = await processPendingJobs();
    total += processed;
    if (processed < BATCH_SIZE) break;
  }
  return total;
}

/** In development, process the queue without a separate `npm run worker` process. */
export function kickWorkerInDev(): void {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.WORKER_EXTERNAL === "true") return;

  void drainPendingJobs().catch((err) => {
    console.error("[dev-worker] Failed to process jobs:", err);
  });
}
