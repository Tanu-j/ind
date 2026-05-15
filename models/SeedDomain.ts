import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ISeedDomain extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  baseUrl: string;
  feedPath: string;
  apiEndpoint?: string;
  apiToken?: string;
  isActive: boolean;
  linkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SeedDomainSchema = new Schema<ISeedDomain>(
  {
    name: { type: String, required: true },
    baseUrl: { type: String, required: true },
    feedPath: { type: String, default: "/feeds/live-index.xml" },
    apiEndpoint: { type: String },
    apiToken: { type: String },
    isActive: { type: Boolean, default: true },
    linkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SeedDomain: Model<ISeedDomain> =
  mongoose.models.SeedDomain ??
  mongoose.model<ISeedDomain>("SeedDomain", SeedDomainSchema);
