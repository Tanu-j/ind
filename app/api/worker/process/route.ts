import { jsonError, jsonOk } from "@/lib/api/response";
import { processPendingJobs } from "@/lib/services/job-worker";

/**
 * Cron-safe endpoint to process queued indexing jobs.
 * Protect with WORKER_SECRET header in production.
 */
export async function POST(request: Request) {
  const secret = process.env.WORKER_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return jsonError("Unauthorized.", 401);
    }
  }

  try {
    const processed = await processPendingJobs();
    return jsonOk({ processed });
  } catch (err) {
    console.error("[worker/process]", err);
    return jsonError("Worker failed.", 500);
  }
}
