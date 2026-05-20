import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { IndexBatch, IndexedUrl } from "@/models";
import type { IndexingStatus } from "@/lib/constants";

const ACTIVE_URL_STATUSES: IndexingStatus[] = [
  "QUEUED",
  "PROCESSING",
  "SUBMITTED",
  "CRAWLED",
];

const RECENT_TERMINAL_MS = 24 * 60 * 60 * 1000;
const MAX_URLS = 200;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.userId);
    const recentCutoff = new Date(Date.now() - RECENT_TERMINAL_MS);

    const [urls, statusBreakdown, processingBatchCount] = await Promise.all([
      IndexedUrl.find({
        userId,
        $or: [
          { status: { $in: ACTIVE_URL_STATUSES } },
          {
            status: { $in: ["INDEXED", "FAILED"] },
            updatedAt: { $gte: recentCutoff },
          },
        ],
      })
        .sort({ updatedAt: -1 })
        .limit(MAX_URLS)
        .lean(),
      IndexedUrl.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      IndexBatch.countDocuments({ userId, status: "PROCESSING" }),
    ]);

    const batchIds = [...new Set(urls.map((u) => u.batchId.toString()))];
    const batches = await IndexBatch.find({ _id: { $in: batchIds } })
      .select("_id status totalUrls mode createdAt")
      .lean();
    const batchById = new Map(batches.map((b) => [b._id.toString(), b]));

    const inProgressCount = urls.filter((u) =>
      ACTIVE_URL_STATUSES.includes(u.status as IndexingStatus)
    ).length;

    const shouldPollFast =
      inProgressCount > 0 || processingBatchCount > 0;

    const breakdown = statusBreakdown.reduce(
      (acc, s) => {
        acc[s._id as string] = s.count;
        return acc;
      },
      {} as Record<string, number>
    );

    return jsonOk({
      inProgressCount,
      processingBatchCount,
      shouldPollFast,
      statusBreakdown: breakdown,
      urls: urls.map((u) => {
        const batch = batchById.get(u.batchId.toString());
        return {
          id: u._id.toString(),
          url: u.url,
          batchId: u.batchId.toString(),
          batchStatus: batch?.status,
          batchMode: batch?.mode,
          routeUsed: u.routeUsed,
          status: u.status,
          errorMessage: u.errorMessage,
          responseMeta: u.responseMeta,
          processedAt: u.processedAt,
          updatedAt: u.updatedAt,
          createdAt: u.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error("[live-status]", err);
    return jsonError("Failed to fetch live status.", 500);
  }
}
