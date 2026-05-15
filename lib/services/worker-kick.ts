import { processPendingJobs } from "@/lib/services/job-worker";

const BATCH_SIZE = 25;

/**
 * Process queued jobs until the queue is empty or maxRounds is reached.
 */
export async function drainPendingJobs(maxRounds = 200): Promise<number> {
  let total = 0;
  for (let i = 0; i < maxRounds; i++) {
    const processed = await processPendingJobs();
    total += processed;
    if (processed < BATCH_SIZE) break;
  }
  return total;
}

/** Process queue immediately after submit (dev + production). */
export function kickWorkerAfterSubmit(): void {
  if (process.env.WORKER_EXTERNAL === "true") return;

  void drainPendingJobs().catch((err) => {
    console.error("[worker-kick] Failed to process jobs:", err);
  });
}

/** @deprecated Use kickWorkerAfterSubmit */
export function kickWorkerInDev(): void {
  kickWorkerAfterSubmit();
}
