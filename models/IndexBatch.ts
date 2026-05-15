import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { BatchStatus, IndexingMode } from "@/lib/constants";

export interface IIndexBatch extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  totalUrls: number;
  apiCount: number;
  crawlTrapCount: number;
  indexNowCount: number;
  mode?: IndexingMode;
  status: BatchStatus;
  completedCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const IndexBatchSchema = new Schema<IIndexBatch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    totalUrls: { type: Number, required: true },
    apiCount: { type: Number, default: 0 },
    crawlTrapCount: { type: Number, default: 0 },
    indexNowCount: { type: Number, default: 0 },
    mode: {
      type: String,
      enum: ["google_instant", "hybrid", "maximum"],
      default: "google_instant",
    },
    status: {
      type: String,
      enum: ["PROCESSING", "COMPLETED", "FAILED", "PARTIAL"],
      default: "PROCESSING",
    },
    completedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

IndexBatchSchema.index({ userId: 1, createdAt: -1 });

export const IndexBatch: Model<IIndexBatch> =
  mongoose.models.IndexBatch ??
  mongoose.model<IIndexBatch>("IndexBatch", IndexBatchSchema);
