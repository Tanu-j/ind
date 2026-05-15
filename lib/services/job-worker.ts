import { connectDB } from "@/lib/db/mongodb";
import { decryptJson } from "@/lib/crypto/credentials";
import { publishUrlUpdate } from "@/lib/services/google-indexing";
import { submitToIndexNow } from "@/lib/services/indexnow";
import {
  generateCrawlTrapContent,
  publishToSeedDomain,
  pingFeedDiscovery,
} from "@/lib/services/crawl-trap";
import { refreshBatchStatus } from "@/lib/services/batch-processor";
import {
  ProcessingJob,
  IndexedUrl,
  GcpCredential,
  SeedDomain,
} from "@/models";

const DAILY_API_LIMIT = 200;
const BATCH_SIZE = 10;

export async function processPendingJobs(): Promise<number> {
  await connectDB();

  const jobs = await ProcessingJob.find({
    status: "PENDING",
    scheduledAt: { $lte: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .limit(BATCH_SIZE);

  let processed = 0;

  for (const job of jobs) {
    const claimed = await ProcessingJob.findOneAndUpdate(
      { _id: job._id, status: "PENDING" },
      { $set: { status: "ACTIVE", startedAt: new Date() }, $inc: { attempts: 1 } },
      { returnDocument: "after" }
    );

    if (!claimed) continue;

    try {
      await executeJob(claimed);
      claimed.status = "COMPLETED";
      claimed.completedAt = new Date();
      await claimed.save();
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Job failed.";
      claimed.lastError = message;

      if (claimed.attempts >= claimed.maxAttempts) {
        claimed.status = "FAILED";
        claimed.completedAt = new Date();
        await IndexedUrl.findByIdAndUpdate(claimed.indexedUrlId, {
          status: "FAILED",
          errorMessage: message,
          processedAt: new Date(),
        });
      } else {
        claimed.status = "PENDING";
        claimed.scheduledAt = new Date(Date.now() + 60_000 * claimed.attempts);
      }
      await claimed.save();
    }

    await refreshBatchStatus(claimed.batchId.toString());
  }

  return processed;
}

async function executeJob(
  job: InstanceType<typeof ProcessingJob>
): Promise<void> {
  const url = job.payload.url;

  switch (job.type) {
    case "API_INDEXING":
      await processApiJob(job, url);
      break;
    case "CRAWL_TRAP":
      await processCrawlTrapJob(url);
      await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
        status: "SUBMITTED",
        processedAt: new Date(),
      });
      break;
    case "INDEX_NOW": {
      const result = await submitToIndexNow([url]);
      await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
        $set: {
          responseMeta: { indexNow: result },
        },
      });
      break;
    }
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function processApiJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const credentialId = job.payload.credentialId;

  if (!credentialId) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      status: "FAILED",
      errorMessage: "No GCP credential configured. Add one in Settings.",
      processedAt: new Date(),
    });
    return;
  }

  const credential = await GcpCredential.findById(credentialId);
  if (!credential || !credential.isActive) {
    throw new Error("GCP credential not found or inactive.");
  }

  await resetDailyUsageIfNeeded(credential);

  if (credential.dailyUsage >= DAILY_API_LIMIT) {
    throw new Error("Daily Indexing API quota exceeded for this credential.");
  }

  const json = decryptJson(credential.encryptedJson);
  const result = await publishUrlUpdate(json, url);

  if (!result.success) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      status: "FAILED",
      errorMessage: result.error,
      processedAt: new Date(),
    });
    throw new Error(result.error ?? "Indexing API failed.");
  }

  credential.dailyUsage += 1;
  await credential.save();

  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    status: "SUBMITTED",
    responseMeta: { indexingApi: result.data },
    processedAt: new Date(),
  });
}

async function resetDailyUsageIfNeeded(
  credential: InstanceType<typeof GcpCredential>
): Promise<void> {
  const now = new Date();
  const resetAt = new Date(credential.dailyUsageResetAt);
  if (now.getTime() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
    credential.dailyUsage = 0;
    credential.dailyUsageResetAt = now;
    await credential.save();
  }
}

async function processCrawlTrapJob(url: string): Promise<void> {
  const seed = await SeedDomain.findOne({ isActive: true }).sort({ linkCount: 1 });
  const item = generateCrawlTrapContent(url);

  if (seed) {
    const publishResult = await publishToSeedDomain(seed, item);
    seed.linkCount += 1;
    await seed.save();

    if (!publishResult.success && seed.apiEndpoint) {
      throw new Error(publishResult.error ?? "Crawl trap publish failed.");
    }

    const feedUrl = `${seed.baseUrl.replace(/\/$/, "")}${seed.feedPath}`;
    await pingFeedDiscovery(feedUrl);
  }
}
