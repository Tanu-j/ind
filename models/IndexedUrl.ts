import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { IndexingStatus, RouteType } from "@/lib/constants";

export interface IIndexedUrl extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  url: string;
  routeUsed: RouteType;
  status: IndexingStatus;
  errorMessage?: string;
  responseMeta?: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IndexedUrlSchema = new Schema<IIndexedUrl>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "IndexBatch", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true },
    routeUsed: {
      type: String,
      enum: ["API_INDEXING", "CRAWL_TRAP", "INDEX_NOW"],
      required: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "SUBMITTED", "CRAWLED", "INDEXED", "FAILED"],
      default: "QUEUED",
    },
    errorMessage: { type: String },
    responseMeta: { type: Schema.Types.Mixed },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

IndexedUrlSchema.index({ batchId: 1, status: 1 });
IndexedUrlSchema.index({ userId: 1, url: 1 });

export const IndexedUrl: Model<IIndexedUrl> =
  mongoose.models.IndexedUrl ??
  mongoose.model<IIndexedUrl>("IndexedUrl", IndexedUrlSchema);
