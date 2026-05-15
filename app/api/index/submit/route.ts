import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { submitUrlsSchema, validateUrlCount } from "@/lib/validators/indexing";
import { createIndexingBatch } from "@/lib/services/batch-processor";
import { kickWorkerAfterSubmit } from "@/lib/services/worker-kick";
import { DEFAULT_INDEXING_MODE } from "@/lib/constants";
import { parseUrlList } from "@/lib/utils";
import { MAX_URLS_PER_BATCH } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const body = await request.json();
    const parsed = submitUrlsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    const urls = parseUrlList(parsed.data.rawUrls);
    const countError = validateUrlCount(urls.length);
    if (countError) return jsonError(countError);

    if (urls.length > MAX_URLS_PER_BATCH) {
      return jsonError(`Maximum ${MAX_URLS_PER_BATCH} URLs per batch.`);
    }

    await connectDB();

    const result = await createIndexingBatch(
      session.userId,
      parsed.data.rawUrls,
      parsed.data.mode ?? DEFAULT_INDEXING_MODE
    );
    kickWorkerAfterSubmit();

    return jsonOk(result, 202);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed.";
    console.error("[index/submit]", err);
    return jsonError(message, message.includes("credits") ? 402 : 500);
  }
}
