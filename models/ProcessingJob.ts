import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { JobStatus, JobType } from "@/lib/constants";

export interface IProcessingJob extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  indexedUrlId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: JobType;
  payload: {
    url: string;
    credentialId?: string;
    credentialSource?: "user" | "platform";
    seedDomainId?: string;
  };
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessingJobSchema = new Schema<IProcessingJob>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "IndexBatch", required: true, index: true },
    indexedUrlId: { type: Schema.Types.ObjectId, ref: "IndexedUrl", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["API_INDEXING", "CRAWL_TRAP", "INDEX_NOW", "GOOGLE_VERIFY", "DISCOVERY_PING"],
      required: true,
    },
    payload: {
      url: { type: String, required: true },
      credentialId: { type: String },
      credentialSource: { type: String, enum: ["user", "platform"] },
      seedDomainId: { type: String },
    },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String },
    scheduledAt: { type: Date, default: Date.now, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ProcessingJobSchema.index({ status: 1, scheduledAt: 1 });

export const ProcessingJob: Model<IProcessingJob> =
  mongoose.models.ProcessingJob ??
  mongoose.model<IProcessingJob>("ProcessingJob", ProcessingJobSchema);
