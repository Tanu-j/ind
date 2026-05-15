import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import {
  DEFAULT_API_SPLIT,
  DEFAULT_INDEXING_MODE,
  TURBO_CREDIT_MULTIPLIER,
  type IndexingMode,
} from "@/lib/constants";
import { splitHybridUrls, parseUrlList } from "@/lib/utils";
import { resolveGcpCredential } from "@/lib/services/platform-key-pool";
import { runPreflightBatch } from "@/lib/services/preflight";
import { saveBatchSitemap } from "@/lib/services/batch-sitemap";
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
  preflightFailed: number;
  creditsUsed: number;
}

type JobInsert = {
  batchId: mongoose.Types.ObjectId;
  indexedUrlId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type:
    | "API_INDEXING"
    | "CRAWL_TRAP"
    | "INDEX_NOW"
    | "BATCH_INDEXNOW"
    | "GOOGLE_VERIFY"
    | "GSC_INSPECT"
    | "GSC_SITEMAP"
    | "DISCOVERY_PING"
    | "WEBSUB_PING";
  payload: {
    url?: string;
    urls?: string[];
    credentialId?: string;
    credentialSource?: "user" | "platform";
    propertyUrl?: string;
    batchId?: string;
    sitemapUrl?: string;
    feedUrl?: string;
  };
  scheduledAt?: Date;
};

function planUrlRoutes(
  urls: string[],
  mode: IndexingMode,
  hasCredential: boolean
): { api: string[]; crawlTrap: string[] } {
  if (mode === "google_instant" || mode === "turbo") {
    return { api: urls, crawlTrap: mode === "turbo" ? urls : [] };
  }
  if (mode === "maximum") {
    return { api: urls, crawlTrap: urls };
  }
  const apiRatio = Number(process.env.HYBRID_API_RATIO ?? DEFAULT_API_SPLIT);
  const split = splitHybridUrls(urls, hasCredential ? apiRatio : 0);
  if (!hasCredential) return { api: [], crawlTrap: urls };
  return split;
}

function usesFullGooglePipeline(mode: IndexingMode): boolean {
  return mode === "google_instant" || mode === "maximum" || mode === "turbo";
}

export async function createIndexingBatch(
  userId: string,
  rawUrls: string,
  mode: IndexingMode = DEFAULT_INDEXING_MODE
): Promise<SubmitBatchResult> {
  await connectDB();

  const parsedUrls = parseUrlList(rawUrls);
  if (parsedUrls.length === 0) {
    throw new Error("No valid URLs provided.");
  }

  const creditCost = mode === "turbo" ? TURBO_CREDIT_MULTIPLIER : 1;
  const creditsNeeded = parsedUrls.length * creditCost;

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found.");
  if (user.credits < creditsNeeded) {
    throw new Error(
      `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}.`
    );
  }

  const credential = await resolveGcpCredential(userId);
  const hasGoogleCredential = Boolean(credential);

  if (usesFullGooglePipeline(mode) && !hasGoogleCredential) {
    throw new Error(
      "Google Indexing API is not configured. Add your GCP key in Settings, or set PLATFORM_GCP_SERVICE_ACCOUNT_JSON / PLATFORM_GCP_KEYS_JSON."
    );
  }

  const preflightResults = await runPreflightBatch(parsedUrls);
  const failedPreflight = preflightResults.filter((p) => !p.ok);
  const urls = preflightResults.filter((p) => p.ok).map((p) => p.url);

  if (urls.length === 0) {
    const first = failedPreflight[0];
    throw new Error(
      first?.errors.join(" ") ?? "All URLs failed preflight checks."
    );
  }

  const actualCredits = urls.length * creditCost;
  const { api: apiUrls, crawlTrap: crawlTrapUrls } = planUrlRoutes(
    urls,
    mode,
    hasGoogleCredential
  );

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    user.credits -= actualCredits;
    await user.save({ session });

    const indexNowCount = usesFullGooglePipeline(mode) ? urls.length : crawlTrapUrls.length;

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
    const batchIdStr = batchDoc._id.toString();

    await saveBatchSitemap(batchIdStr, userId, urls);

    const urlToRoute = new Map<string, "API_INDEXING" | "CRAWL_TRAP">();
    for (const url of apiUrls) urlToRoute.set(url, "API_INDEXING");
    for (const url of crawlTrapUrls) {
      if (!urlToRoute.has(url)) urlToRoute.set(url, "CRAWL_TRAP");
    }

    const preflightByUrl = new Map(preflightResults.map((p) => [p.url, p]));

    const indexedUrlDocs = urls.map((url) => ({
      batchId: batchDoc._id,
      userId: user._id,
      url,
      routeUsed: urlToRoute.get(url) ?? "CRAWL_TRAP",
      responseMeta: { preflight: preflightByUrl.get(url) },
    }));

    const createdUrls = await IndexedUrl.insertMany(indexedUrlDocs, { session });
    const urlIdByUrl = new Map(createdUrls.map((u) => [u.url, u._id]));

    const jobs: JobInsert[] = [];
    const credId = credential?.id;
    const credSource = credential?.source;
    const propertyUrl = credential?.propertyUrl;

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
            propertyUrl,
          },
        });
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "GOOGLE_VERIFY",
          payload: { url, credentialId: credId, credentialSource: credSource },
          scheduledAt: new Date(Date.now() + 15_000),
        });
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "GSC_INSPECT",
          payload: {
            url,
            credentialId: credId,
            credentialSource: credSource,
            propertyUrl,
          },
          scheduledAt: new Date(Date.now() + 45_000),
        });
      }

      if (mode === "turbo") {
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
          type: "DISCOVERY_PING",
          payload: { url },
        });
      } else if (usesFullGooglePipeline(mode)) {
        jobs.push({
          batchId: batchDoc._id,
          indexedUrlId,
          userId: user._id,
          type: "DISCOVERY_PING",
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
      }
    }

    if (usesFullGooglePipeline(mode)) {
      jobs.push({
        batchId: batchDoc._id,
        userId: user._id,
        type: "BATCH_INDEXNOW",
        payload: { urls, batchId: batchIdStr },
      });
    } else if (crawlTrapUrls.length > 0) {
      jobs.push({
        batchId: batchDoc._id,
        userId: user._id,
        type: "BATCH_INDEXNOW",
        payload: { urls: crawlTrapUrls, batchId: batchIdStr },
      });
    }

    if (credential && usesFullGooglePipeline(mode)) {
      const { getBatchSitemapPublicUrl } = await import("@/lib/services/batch-sitemap");
      jobs.push({
        batchId: batchDoc._id,
        userId: user._id,
        type: "GSC_SITEMAP",
        payload: {
          credentialId: credId,
          credentialSource: credSource,
          propertyUrl,
          sitemapUrl: getBatchSitemapPublicUrl(batchIdStr),
          batchId: batchIdStr,
        },
      });
    }

    if (mode === "turbo" || mode === "maximum") {
      const feedUrl = `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/feeds/live-index.xml`;
      jobs.push({
        batchId: batchDoc._id,
        userId: user._id,
        type: "WEBSUB_PING",
        payload: { feedUrl },
      });
    }

    for (const fail of failedPreflight) {
      await IndexedUrl.create(
        [
          {
            batchId: batchDoc._id,
            userId: user._id,
            url: fail.url,
            routeUsed: "API_INDEXING",
            status: "FAILED",
            errorMessage: fail.errors.join("; "),
            responseMeta: { preflight: fail },
            processedAt: new Date(),
          },
        ],
        { session }
      );
    }

    await ProcessingJob.insertMany(jobs, { session });
    await session.commitTransaction();

    return {
      batchId: batchIdStr,
      totalUrls: urls.length,
      apiCount: apiUrls.length,
      crawlTrapCount: crawlTrapUrls.length,
      indexNowCount,
      mode,
      hasGoogleCredential,
      preflightFailed: failedPreflight.length,
      creditsUsed: actualCredits,
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
