import { connectDB } from "@/lib/db/mongodb";
import { decryptJson } from "@/lib/crypto/credentials";
import {
  publishUrlUpdate,
  getUrlIndexingMetadata,
} from "@/lib/services/google-indexing";
import { submitToIndexNow } from "@/lib/services/indexnow";
import { submitDiscoverySignals } from "@/lib/services/google-discovery";
import {
  generateCrawlTrapContent,
  publishToSeedDomain,
  pingFeedDiscovery,
} from "@/lib/services/crawl-trap";
import { appendFeedItem } from "@/lib/services/feed-store";
import { refreshBatchStatus } from "@/lib/services/batch-processor";
import {
  resetDailyUsageIfNeeded,
  incrementCredentialUsage,
} from "@/lib/services/platform-credentials";
import {
  ProcessingJob,
  IndexedUrl,
  GcpCredential,
  SeedDomain,
} from "@/models";

const DAILY_API_LIMIT = 200;
const BATCH_SIZE = 25;

async function getCredentialJson(
  credentialId?: string,
  credentialSource?: "user" | "platform"
): Promise<string | null> {
  if (credentialSource === "platform" || credentialId === "platform") {
    const json = process.env.PLATFORM_GCP_SERVICE_ACCOUNT_JSON?.trim();
    return json ?? null;
  }
  if (!credentialId) return null;
  const credential = await GcpCredential.findById(credentialId);
  if (!credential || !credential.isActive) return null;
  return decryptJson(credential.encryptedJson);
}

export async function processPendingJobs(): Promise<number> {
  await connectDB();

  const jobs = await ProcessingJob.find({
    status: "PENDING",
    scheduledAt: { $lte: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .limit(BATCH_SIZE);

  let processed = 0;

  await Promise.all(
    jobs.map(async (job) => {
      const claimed = await ProcessingJob.findOneAndUpdate(
        { _id: job._id, status: "PENDING" },
        { $set: { status: "ACTIVE", startedAt: new Date() }, $inc: { attempts: 1 } },
        { returnDocument: "after" }
      );

      if (!claimed) return;

      try {
        await executeJob(claimed);
        claimed.status = "COMPLETED";
        claimed.completedAt = new Date();
        await claimed.save();
        processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Job failed.";
        claimed.lastError = message;

        const noRetry = claimed.type === "GOOGLE_VERIFY" || claimed.type === "DISCOVERY_PING";

        if (claimed.attempts >= claimed.maxAttempts || noRetry) {
          claimed.status = "FAILED";
          claimed.completedAt = new Date();
          if (
            claimed.type === "API_INDEXING" ||
            (claimed.type === "INDEX_NOW" && claimed.attempts >= claimed.maxAttempts)
          ) {
            await IndexedUrl.findByIdAndUpdate(claimed.indexedUrlId, {
              status: "FAILED",
              errorMessage: message,
              processedAt: new Date(),
            });
          }
        } else {
          claimed.status = "PENDING";
          claimed.scheduledAt = new Date(Date.now() + 30_000 * claimed.attempts);
        }
        await claimed.save();
      }

      await refreshBatchStatus(claimed.batchId.toString());
    })
  );

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
      await processCrawlTrapJob(job, url);
      break;
    case "INDEX_NOW":
      await processIndexNowJob(job, url);
      break;
    case "GOOGLE_VERIFY":
      await processGoogleVerifyJob(job, url);
      break;
    case "DISCOVERY_PING":
      await processDiscoveryPingJob(job, url);
      break;
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function processApiJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const json = await getCredentialJson(
    job.payload.credentialId,
    job.payload.credentialSource as "user" | "platform" | undefined
  );

  if (!json) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      status: "FAILED",
      errorMessage: "No Google Indexing API credential available.",
      processedAt: new Date(),
    });
    throw new Error("No Google Indexing API credential available.");
  }

  if (job.payload.credentialSource === "user" && job.payload.credentialId) {
    const credential = await GcpCredential.findById(job.payload.credentialId);
    if (credential) {
      await resetDailyUsageIfNeeded(credential);
      if (credential.dailyUsage >= DAILY_API_LIMIT) {
        throw new Error("Daily Indexing API quota exceeded for this credential.");
      }
    }
  }

  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    status: "PROCESSING",
  });

  const result = await publishUrlUpdate(json, url);

  if (!result.success) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      status: "FAILED",
      errorMessage: result.error,
      processedAt: new Date(),
    });
    throw new Error(result.error ?? "Indexing API failed.");
  }

  if (job.payload.credentialSource === "user" && job.payload.credentialId) {
    const credential = await GcpCredential.findById(job.payload.credentialId);
    if (credential) {
      await incrementCredentialUsage({
        id: credential._id.toString(),
        json,
        source: "user",
        record: credential,
      });
    }
  }

  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    status: "SUBMITTED",
    responseMeta: {
      indexingApi: result.data,
      googleNotifiedAt: new Date().toISOString(),
      message: "Submitted to Google Indexing API — crawl typically within minutes.",
    },
    processedAt: new Date(),
  });
}

async function processGoogleVerifyJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const indexedUrl = await IndexedUrl.findById(job.indexedUrlId);
  if (!indexedUrl || indexedUrl.status === "FAILED") return;

  const json = await getCredentialJson(
    job.payload.credentialId,
    job.payload.credentialSource as "user" | "platform" | undefined
  );
  if (!json) return;

  const meta = await getUrlIndexingMetadata(json, url);
  if (meta.success && meta.data) {
    const data = meta.data as { latestUpdate?: { notifyTime?: string } };
    if (data.latestUpdate?.notifyTime) {
      await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
        status: "INDEXED",
        responseMeta: {
          ...((indexedUrl.responseMeta as Record<string, unknown>) ?? {}),
          googleMetadata: meta.data,
          googleIndexedAt: data.latestUpdate.notifyTime,
        },
      });
      return;
    }
  }

  if (indexedUrl.status === "SUBMITTED") {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      $set: {
        responseMeta: {
          ...((indexedUrl.responseMeta as Record<string, unknown>) ?? {}),
          googleMetadataCheck: meta.success ? meta.data : meta.error,
        },
      },
    });
  }
}

async function processDiscoveryPingJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const signals = await submitDiscoverySignals(url);
  const indexedUrl = await IndexedUrl.findById(job.indexedUrlId);
  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    $set: {
      responseMeta: {
        ...((indexedUrl?.responseMeta as Record<string, unknown>) ?? {}),
        discovery: signals,
      },
    },
  });
}

async function processIndexNowJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const result = await submitToIndexNow([url]);
  const indexedUrl = await IndexedUrl.findById(job.indexedUrlId);

  if (!result.success) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      $set: {
        responseMeta: {
          ...((indexedUrl?.responseMeta as Record<string, unknown>) ?? {}),
          indexNow: result,
        },
      },
    });
    return;
  }

  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    $set: {
      responseMeta: {
        ...((indexedUrl?.responseMeta as Record<string, unknown>) ?? {}),
        indexNow: result,
      },
      ...(indexedUrl?.status === "SUBMITTED" || indexedUrl?.status === "CRAWLED"
        ? {}
        : {}),
    },
  });
}

async function processCrawlTrapJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const seed = await SeedDomain.findOne({ isActive: true }).sort({ linkCount: 1 });
  const item = generateCrawlTrapContent(url);

  if (!seed) {
    throw new Error(
      "No active seed domain. Run npm run seed and ensure APP_URL is set."
    );
  }

  await appendFeedItem(seed._id.toString(), item);

  const publishResult = await publishToSeedDomain(seed, item);
  seed.linkCount += 1;
  await seed.save();

  if (!publishResult.success) {
    throw new Error(publishResult.error ?? "Crawl trap publish failed.");
  }

  const feedUrl = `${seed.baseUrl.replace(/\/$/, "")}${seed.feedPath}`;
  await pingFeedDiscovery(feedUrl);

  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    status: "CRAWLED",
    processedAt: new Date(),
    responseMeta: { crawlTrap: { feedUrl, seedName: seed.name } },
  });
}
