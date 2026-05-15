import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IFeedItem extends Document {
  _id: mongoose.Types.ObjectId;
  seedDomainId: mongoose.Types.ObjectId;
  url: string;
  title: string;
  description: string;
  pubDate: Date;
  createdAt: Date;
}

const FeedItemSchema = new Schema<IFeedItem>(
  {
    seedDomainId: { type: Schema.Types.ObjectId, ref: "SeedDomain", required: true },
    url: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    pubDate: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FeedItemSchema.index({ seedDomainId: 1, createdAt: -1 });

export const FeedItem: Model<IFeedItem> =
  mongoose.models.FeedItem ?? mongoose.model<IFeedItem>("FeedItem", FeedItemSchema);
