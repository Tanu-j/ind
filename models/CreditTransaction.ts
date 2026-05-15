import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICreditTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  packageId: string;
  credits: number;
  amountUsd: number;
  status: "completed" | "pending" | "failed";
  createdAt: Date;
}

const CreditTransactionSchema = new Schema<ICreditTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    packageId: { type: String, required: true },
    credits: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
      default: "completed",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CreditTransaction: Model<ICreditTransaction> =
  mongoose.models.CreditTransaction ??
  mongoose.model<ICreditTransaction>("CreditTransaction", CreditTransactionSchema);
