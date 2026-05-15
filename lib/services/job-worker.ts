import { connectDB } from "@/lib/db/mongodb";
import { decryptJson } from "@/lib/crypto/credentials";
import {
  publishUrlUpdate,
  getUrlIndexingMetadata,
} from "@/lib/services/google-indexing";
import { submitToIndexNow } from "@/lib/services/indexnow";
import { resolveIndexNowConfig } from "@/lib/services/indexnow-config";
import { submitDiscoverySignals } from "@/lib/services/google-discovery";
import { inspectUrl, submitSitemap } from "@/lib/services/google-search-console";
import { pingWebSub } from "@/lib/services/websub";
import {
  generateCrawlTrapContent,
  publishToSeedDomain,
  pingFeedDiscovery,
} from "@/lib/services/crawl-trap";
import { appendFeedItem } from "@/lib/services/feed-store";
import { refreshBatchStatus } from "@/lib/services/batch-processor";
import {
  incrementCredentialUsage,
  resetDailyUsageIfNeeded,
} from "@/lib/services/platform-key-pool";
import {
  ProcessingJob,
  IndexedUrl,
  GcpCredential,
  PlatformGcpKey,
  SeedDomain,
} from "@/models";

const DAILY_API_LIMIT = 200;
const BATCH_SIZE = 30;

async function getCredentialJson(
  credentialId?: string,
  credentialSource?: "user" | "platform"
): Promise<string | null> {
  if (credentialSource === "platform" && credentialId) {
    const row = await PlatformGcpKey.findById(credentialId);
    if (row?.isActive) return decryptJson(row.encryptedJson);
  }
  if (credentialId && credentialId !== "platform") {
    const credential = await GcpCredential.findById(credentialId);
    if (credential?.isActive) return decryptJson(credential.encryptedJson);
  }
  const single = process.env.PLATFORM_GCP_SERVICE_ACCOUNT_JSON?.trim();
  return single ?? null;
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

      const softFail = ["GOOGLE_VERIFY", "GSC_INSPECT", "DISCOVERY_PING", "WEBSUB_PING"].includes(
        claimed.type
      );

      if (claimed.attempts >= claimed.maxAttempts && !softFail) {
        claimed.status = "FAILED";
        claimed.completedAt = new Date();
        if (claimed.type === "API_INDEXING" && claimed.indexedUrlId) {
          await IndexedUrl.findByIdAndUpdate(claimed.indexedUrlId, {
            status: "FAILED",
            errorMessage: message,
            processedAt: new Date(),
          });
        }
      } else if (claimed.attempts >= claimed.maxAttempts) {
        claimed.status = "COMPLETED";
        claimed.completedAt = new Date();
      } else {
        claimed.status = "PENDING";
        claimed.scheduledAt = new Date(Date.now() + 30_000 * claimed.attempts);
      }
      await claimed.save();
    }

    await refreshBatchStatus(claimed.batchId.toString());
  }

  return processed;
}

async function executeJob(job: InstanceType<typeof ProcessingJob>): Promise<void> {
  switch (job.type) {
    case "API_INDEXING":
      if (!job.payload.url) throw new Error("Missing url");
      await processApiJob(job, job.payload.url);
      break;
    case "CRAWL_TRAP":
      if (!job.payload.url) throw new Error("Missing url");
      await processCrawlTrapJob(job, job.payload.url);
      break;
    case "INDEX_NOW":
      if (!job.payload.url) throw new Error("Missing url");
      await processIndexNowJob(job, job.payload.url);
      break;
    case "BATCH_INDEXNOW":
      await processBatchIndexNowJob(job);
      break;
    case "GOOGLE_VERIFY":
      if (!job.payload.url) return;
      await processGoogleVerifyJob(job, job.payload.url);
      break;
    case "GSC_INSPECT":
      if (!job.payload.url) return;
      await processGscInspectJob(job, job.payload.url);
      break;
    case "GSC_SITEMAP":
      await processGscSitemapJob(job);
      break;
    case "DISCOVERY_PING":
      if (!job.payload.url) return;
      await processDiscoveryPingJob(job, job.payload.url);
      break;
    case "WEBSUB_PING":
      await processWebSubJob(job);
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
    job.payload.credentialSource
  );

  if (!json) {
    if (job.indexedUrlId) {
      await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
        status: "FAILED",
        errorMessage: "No Google credential available.",
        processedAt: new Date(),
      });
    }
    throw new Error("No Google credential available.");
  }

  if (job.payload.credentialSource === "user" && job.payload.credentialId) {
    const credential = await GcpCredential.findById(job.payload.credentialId);
    if (credential) {
      await resetDailyUsageIfNeeded(credential);
      if (credential.dailyUsage >= DAILY_API_LIMIT) {
        throw new Error("Daily Indexing API quota exceeded.");
      }
    }
  }

  if (job.indexedUrlId) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, { status: "PROCESSING" });
  }

  const result = await publishUrlUpdate(json, url);

  if (!result.success) {
    if (job.indexedUrlId) {
      await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
        status: "FAILED",
        errorMessage: result.error,
        processedAt: new Date(),
      });
    }
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
  } else if (job.payload.credentialId) {
    await incrementCredentialUsage({
      id: job.payload.credentialId,
      json,
      source: "platform",
      platformRecord: (await PlatformGcpKey.findById(job.payload.credentialId)) ?? undefined,
    });
  }

  if (job.indexedUrlId) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      status: "SUBMITTED",
      responseMeta: {
        indexingApi: result.data,
        googleNotifiedAt: new Date().toISOString(),
        message: "Submitted to Google Indexing API.",
      },
      processedAt: new Date(),
    });
  }
}

async function processGoogleVerifyJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  if (!job.indexedUrlId) return;
  const indexedUrl = await IndexedUrl.findById(job.indexedUrlId);
  if (!indexedUrl || indexedUrl.status === "FAILED") return;

  const json = await getCredentialJson(
    job.payload.credentialId,
    job.payload.credentialSource
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
    }
  }
}

async function processGscInspectJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  if (!job.indexedUrlId) return;
  const indexedUrl = await IndexedUrl.findById(job.indexedUrlId);
  if (!indexedUrl) return;

  const json = await getCredentialJson(
    job.payload.credentialId,
    job.payload.credentialSource
  );
  if (!json) return;

  const siteUrl = job.payload.propertyUrl ?? url;
  const inspect = await inspectUrl(json, siteUrl, url);

  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    $set: {
      responseMeta: {
        ...((indexedUrl.responseMeta as Record<string, unknown>) ?? {}),
        gscInspection: inspect.data ?? inspect.error,
      },
      ...(inspect.data?.verdict === "PASS" && indexedUrl.status === "SUBMITTED"
        ? { status: "INDEXED" as const }
        : {}),
    },
  });
}

async function processGscSitemapJob(job: InstanceType<typeof ProcessingJob>): Promise<void> {
  const sitemapUrl = job.payload.sitemapUrl;
  if (!sitemapUrl) return;

  const json = await getCredentialJson(
    job.payload.credentialId,
    job.payload.credentialSource
  );
  if (!json) return;

  const siteUrl = job.payload.propertyUrl ?? sitemapUrl;
  await submitSitemap(json, siteUrl, sitemapUrl);
}

async function processBatchIndexNowJob(job: InstanceType<typeof ProcessingJob>): Promise<void> {
  const urls = job.payload.urls ?? [];
  if (!urls.length) return;

  const config = await resolveIndexNowConfig(job.userId.toString());
  const result = await submitToIndexNow(urls, config);

  if (!result.success) {
    throw new Error(result.error ?? "Batch IndexNow failed.");
  }

  await IndexedUrl.updateMany(
    { batchId: job.batchId, url: { $in: urls } },
    {
      $set: {
        "responseMeta.indexNowBatch": result,
      },
    }
  );
}

async function processDiscoveryPingJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const config = await resolveIndexNowConfig(job.userId.toString());
  const signals = await submitDiscoverySignals(url, config ?? undefined);
  if (!job.indexedUrlId) return;
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

async function processWebSubJob(job: InstanceType<typeof ProcessingJob>): Promise<void> {
  const feedUrl = job.payload.feedUrl;
  if (!feedUrl) return;
  await pingWebSub(feedUrl);
}

async function processIndexNowJob(
  job: InstanceType<typeof ProcessingJob>,
  url: string
): Promise<void> {
  const config = await resolveIndexNowConfig(job.userId.toString());
  const result = await submitToIndexNow([url], config);
  if (!job.indexedUrlId) return;
  const indexedUrl = await IndexedUrl.findById(job.indexedUrlId);
  await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
    $set: {
      responseMeta: {
        ...((indexedUrl?.responseMeta as Record<string, unknown>) ?? {}),
        indexNow: result,
      },
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
    throw new Error("No active seed domain. Run npm run seed.");
  }

  await appendFeedItem(seed._id.toString(), item);

  const publishResult = await publishToSeedDomain(seed, item);
  seed.linkCount += 1;
  await seed.save();

  if (!publishResult.success && seed.apiEndpoint) {
    throw new Error(publishResult.error ?? "Crawl trap publish failed.");
  }

  const feedUrl = `${seed.baseUrl.replace(/\/$/, "")}${seed.feedPath}`;
  await pingFeedDiscovery(feedUrl);
  await pingWebSub(feedUrl);

  if (job.indexedUrlId) {
    await IndexedUrl.findByIdAndUpdate(job.indexedUrlId, {
      status: "CRAWLED",
      processedAt: new Date(),
      responseMeta: { crawlTrap: { feedUrl, seedName: seed.name } },
    });
  }
}
