import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { IndexBatch, IndexedUrl } from "@/models";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const { id } = await params;
    await connectDB();

    const batch = await IndexBatch.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.userId),
    }).lean();

    if (!batch) return jsonError("Batch not found.", 404);

    const urls = await IndexedUrl.find({ batchId: id })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    const statusBreakdown = await IndexedUrl.aggregate([
      { $match: { batchId: batch._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return jsonOk({
      batch: {
        id: batch._id.toString(),
        totalUrls: batch.totalUrls,
        apiCount: batch.apiCount,
        crawlTrapCount: batch.crawlTrapCount,
        indexNowCount: batch.indexNowCount,
        status: batch.status,
        completedCount: batch.completedCount,
        failedCount: batch.failedCount,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      },
      urls: urls.map((u) => ({
        id: u._id.toString(),
        url: u.url,
        routeUsed: u.routeUsed,
        status: u.status,
        errorMessage: u.errorMessage,
        processedAt: u.processedAt,
        createdAt: u.createdAt,
      })),
      statusBreakdown: statusBreakdown.reduce(
        (acc, s) => {
          acc[s._id as string] = s.count;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (err) {
    console.error("[batches/id]", err);
    return jsonError("Failed to fetch batch.", 500);
  }
}
