import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import {
  DEFAULT_API_SPLIT,
  DEFAULT_INDEXING_MODE,
  type IndexingMode,
} from "@/lib/constants";
import { splitHybridUrls, parseUrlList } from "@/lib/utils";
import { resolveGcpCredential } from "@/lib/services/platform-credentials";
import {
  User,
  IndexBatch,
  IndexedUrl,
  ProcessingJob,
} from "@/models";

export interface SubmitBatchResult {
  batchId: string;
  totalUrls: number;
  apiCount: number;
  crawlTrapCount: number;
  indexNowCount: number;
  mode: IndexingMode;
  hasGoogleCredential: boolean;
}

type JobInsert = {
  batchId: mongoose.Types.ObjectId;
  indexedUrlId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type:
    | "API_INDEXING"
    | "CRAWL_TRAP"
    | "INDEX_NOW"
    | "GOOGLE_VERIFY"
    | "DISCOVERY_PING";
  payload: {
    url: string;
    credentialId?: string;
    credentialSource?: "user" | "platform";
  };
  scheduledAt?: Date;
};

function planUrlRoutes(
  urls: string[],
  mode: IndexingMode,
  hasCredential: boolean
): { api: string[]; crawlTrap: string[] } {
  if (mode === "google_instant") {
    return { api: urls, crawlTrap: [] };
  }
  if (mode === "maximum") {
    return { api: urls, crawlTrap: urls };
  }
  const apiRatio = Number(process.env.HYBRID_API_RATIO ?? DEFAULT_API_SPLIT);
  const split = splitHybridUrls(urls, hasCredential ? apiRatio : 0);
  if (!hasCredential) {
    return { api: [], crawlTrap: urls };
  }
  return split;
}

export async function createIndexingBatch(
  userId: string,
  rawUrls: string,
  mode: IndexingMode = DEFAULT_INDEXING_MODE
): Promise<SubmitBatchResult> {
  await connectDB();

  const urls = parseUrlList(rawUrls);
  if (urls.length === 0) {
    throw new Error("No valid URLs provided.");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found.");
  if (user.credits < urls.length) {
    throw new Error(`Insufficient credits. Need ${urls.length}, have ${user.credits}.`);
  }

  const credential = await resolveGcpCredential(userId);
  const hasGoogleCredential = Boolean(credential);

  if (
    (mode === "google_instant" || mode === "maximum") &&
    !hasGoogleCredential
  ) {
    throw new Error(
      "Google Indexing API is not configured. Add your GCP key in Settings, or ask the admin to set PLATFORM_GCP_SERVICE_ACCOUNT_JSON."
    );
  }

  const { api: apiUrls, crawlTrap: crawlTrapUrls } = planUrlRoutes(
    urls,
    mode,
    hasGoogleCredential
  );

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    user.credits -= urls.length;
    await user.save({ session });

    const indexNowCount =
      mode === "google_instant" || mode === "maximum" ? urls.length : crawlTrapUrls.length;

    const batch = await IndexBatch.create(
      [
        {
          userId: user._id,
          totalUrls: urls.length,
          apiCount: apiUrls.length,
          crawlTrapCount: crawlTrapUrls.length,
          indexNowCount,
          status: "PROCESSING",
          mode,
        },
      ],
      { session }
    );
    const batchDoc = batch[0];

    const indexedUrlDocs: Array<{
      batchId: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      url: string;
      routeUsed: "API_INDEXING" | "CRAWL_TRAP";
    }> = [];

    const urlToRoute = new Map<string, "API_INDEXING" | "CRAWL_TRAP">();
    for (const url of apiUrls) urlToRoute.set(url, "API_INDEXING");
    for (const url of crawlTrapUrls) {
      if (!urlToRoute.has(url)) urlToRoute.set(url, "CRAWL_TRAP");
    }

    for (const url of urls) {
      indexedUrlDocs.push({
        batchId: batchDoc._id,
        userId: user._id,
        url,
        routeUsed: urlToRoute.get(url) ?? "CRAWL_TRAP",
      });
    }

    const createdUrls = await IndexedUrl.insertMany(indexedUrlDocs, { session });
    const urlIdByUrl = new Map(createdUrls.map((u) => [u.url, u._id]));

    const jobs: JobInsert[] = [];
    const credId = credential?.id;
    const credSource = credential?.source;

    for (const url of urls) {
      const indexedUrlId = urlIdByUrl.get(url)!;

      if (apiUrls.includes(url) && credential) {
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "API_INDEXING",
          payload: {
            url,
            credentialId: credId,
            credentialSource: credSource,
          },
        });
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "GOOGLE_VERIFY",
          payload: {
            url,
            credentialId: credId,
            credentialSource: credSource,
          },
          scheduledAt: new Date(Date.now() + 15_000),
        });
      }

      if (mode === "google_instant" || mode === "maximum") {
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "DISCOVERY_PING",
          payload: { url },
        });
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "INDEX_NOW",
          payload: { url },
        });
      } else if (crawlTrapUrls.includes(url)) {
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "CRAWL_TRAP",
          payload: { url },
        });
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "INDEX_NOW",
          payload: { url },
        });
      }
    }

    await ProcessingJob.insertMany(jobs, { session });
    await session.commitTransaction();

    return {
      batchId: batchDoc._id.toString(),
      totalUrls: urls.length,
      apiCount: apiUrls.length,
      crawlTrapCount: crawlTrapUrls.length,
      indexNowCount,
      mode,
      hasGoogleCredential,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function refreshBatchStatus(batchId: string): Promise<void> {
  await connectDB();

  const stats = await IndexedUrl.aggregate([
    { $match: { batchId: new mongoose.Types.ObjectId(batchId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [
              { $in: ["$status", ["SUBMITTED", "CRAWLED", "INDEXED"]] },
              1,
              0,
            ],
          },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
        },
        pending: {
          $sum: {
            $cond: [{ $in: ["$status", ["QUEUED", "PROCESSING"]] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (!stats.length) return;

  const { total, completed, failed, pending } = stats[0];
  let status: "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL" = "PROCESSING";

  if (pending === 0) {
    if (failed === 0) status = "COMPLETED";
    else if (failed === total) status = "FAILED";
    else status = "PARTIAL";
  }

  await IndexBatch.findByIdAndUpdate(batchId, {
    completedCount: completed,
    failedCount: failed,
    status,
  });
}
