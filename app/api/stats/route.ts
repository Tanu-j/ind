import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { IndexBatch, IndexedUrl, ProcessingJob } from "@/models";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.userId);

    const [batchStats, urlStats, pendingJobs] = await Promise.all([
      IndexBatch.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalBatches: { $sum: 1 },
            totalUrls: { $sum: "$totalUrls" },
          },
        },
      ]),
      IndexedUrl.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      ProcessingJob.countDocuments({
        userId,
        status: "PENDING",
      }),
    ]);

    const batches = batchStats[0] ?? { totalBatches: 0, totalUrls: 0 };

    return jsonOk({
      totalBatches: batches.totalBatches,
      totalUrlsSubmitted: batches.totalUrls,
      pendingJobs,
      urlStatusBreakdown: urlStats.reduce(
        (acc, s) => {
          acc[s._id as string] = s.count;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (err) {
    console.error("[stats]", err);
    return jsonError("Failed to fetch stats.", 500);
  }
}
