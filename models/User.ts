import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  credits: number;
  /** Public base URL for batch sitemap links (CNAME/proxy to this app). Overrides APP_URL for GSC sitemap submit. */
  sitemapPublicBaseUrl?: string;
  /** HTTPS URL — POST JSON on URL indexed events (HMAC optional via webhookSecret). */
  webhookUrl?: string;
  webhookSecret?: string;
  /** Higher runs first in the worker queue (0–100). Use for paid tiers. */
  processingPriority?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    credits: { type: Number, default: 100, min: 0 },
    sitemapPublicBaseUrl: { type: String, trim: true },
    webhookUrl: { type: String, trim: true },
    webhookSecret: { type: String, trim: true },
    processingPriority: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
