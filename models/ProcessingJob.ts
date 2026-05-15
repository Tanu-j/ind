import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { JobStatus, JobType } from "@/lib/constants";

export interface IProcessingJobPayload {
  url?: string;
  urls?: string[];
  credentialId?: string;
  credentialSource?: "user" | "platform";
  propertyUrl?: string;
  batchId?: string;
  sitemapUrl?: string;
  feedUrl?: string;
  seedDomainId?: string;
}

export interface IProcessingJob extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  indexedUrlId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: JobType;
  payload: IProcessingJobPayload;
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
    indexedUrlId: { type: Schema.Types.ObjectId, ref: "IndexedUrl" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "API_INDEXING",
        "CRAWL_TRAP",
        "INDEX_NOW",
        "BATCH_INDEXNOW",
        "GOOGLE_VERIFY",
        "GSC_INSPECT",
        "GSC_SITEMAP",
        "DISCOVERY_PING",
        "WEBSUB_PING",
      ],
      required: true,
    },
    payload: { type: Schema.Types.Mixed, default: {} },
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
