import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IBatchSitemap extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  urls: string[];
  createdAt: Date;
}

const BatchSitemapSchema = new Schema<IBatchSitemap>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "IndexBatch", required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    urls: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const BatchSitemap: Model<IBatchSitemap> =
  mongoose.models.BatchSitemap ??
  mongoose.model<IBatchSitemap>("BatchSitemap", BatchSitemapSchema);
