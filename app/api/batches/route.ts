import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { IndexBatch } from "@/models";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.userId);

    const [batches, total] = await Promise.all([
      IndexBatch.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IndexBatch.countDocuments({ userId }),
    ]);

    return jsonOk({
      batches: batches.map((b) => ({
        id: b._id.toString(),
        totalUrls: b.totalUrls,
        apiCount: b.apiCount,
        crawlTrapCount: b.crawlTrapCount,
        indexNowCount: b.indexNowCount,
        status: b.status,
        completedCount: b.completedCount,
        failedCount: b.failedCount,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[batches]", err);
    return jsonError("Failed to fetch batches.", 500);
  }
}
