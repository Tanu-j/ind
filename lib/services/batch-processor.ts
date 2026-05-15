import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import { DEFAULT_API_SPLIT } from "@/lib/constants";
import { splitHybridUrls, parseUrlList } from "@/lib/utils";
import {
  User,
  IndexBatch,
  IndexedUrl,
  ProcessingJob,
  GcpCredential,
} from "@/models";

export interface SubmitBatchResult {
  batchId: string;
  totalUrls: number;
  apiCount: number;
  crawlTrapCount: number;
  indexNowCount: number;
}

export async function createIndexingBatch(
  userId: string,
  rawUrls: string
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

  const apiRatio = Number(process.env.HYBRID_API_RATIO ?? DEFAULT_API_SPLIT);
  const { api: apiUrls, crawlTrap: crawlTrapUrls } = splitHybridUrls(urls, apiRatio);

  const activeCredential = await GcpCredential.findOne({
    userId: user._id,
    isActive: true,
  }).sort({ dailyUsage: 1 });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    user.credits -= urls.length;
    await user.save({ session });

    const batch = await IndexBatch.create(
      [
        {
          userId: user._id,
          totalUrls: urls.length,
          apiCount: apiUrls.length,
          crawlTrapCount: crawlTrapUrls.length,
          indexNowCount: crawlTrapUrls.length,
          status: "PROCESSING",
        },
      ],
      { session }
    );
    const batchDoc = batch[0];

    const indexedUrlDocs: Array<{
      batchId: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      url: string;
      routeUsed: "API_INDEXING" | "CRAWL_TRAP" | "INDEX_NOW";
    }> = [];

    for (const url of apiUrls) {
      indexedUrlDocs.push({
        batchId: batchDoc._id,
        userId: user._id,
        url,
        routeUsed: "API_INDEXING",
      });
    }

    for (const url of crawlTrapUrls) {
      indexedUrlDocs.push({
        batchId: batchDoc._id,
        userId: user._id,
        url,
        routeUsed: "CRAWL_TRAP",
      });
    }

    const createdUrls = await IndexedUrl.insertMany(indexedUrlDocs, { session });

    const jobs: Array<{
      batchId: mongoose.Types.ObjectId;
      indexedUrlId: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      type: "API_INDEXING" | "CRAWL_TRAP" | "INDEX_NOW";
      payload: { url: string; credentialId?: string };
    }> = [];

    let urlIndex = 0;
    for (const url of apiUrls) {
      jobs.push({
        batchId: batchDoc._id,
        indexedUrlId: createdUrls[urlIndex]._id,
        userId: user._id,
        type: "API_INDEXING",
        payload: {
          url,
          credentialId: activeCredential?._id.toString(),
        },
      });
      urlIndex++;
    }

    for (const url of crawlTrapUrls) {
      const indexedUrlId = createdUrls[urlIndex]._id;
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
      urlIndex++;
    }

    await ProcessingJob.insertMany(jobs, { session });
    await session.commitTransaction();

    return {
      batchId: batchDoc._id.toString(),
      totalUrls: urls.length,
      apiCount: apiUrls.length,
      crawlTrapCount: crawlTrapUrls.length,
      indexNowCount: crawlTrapUrls.length,
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
