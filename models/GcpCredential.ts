import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IGcpCredential extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  label: string;
  propertyUrl: string;
  clientEmail: string;
  encryptedJson: string;
  isActive: boolean;
  dailyUsage: number;
  dailyUsageResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GcpCredentialSchema = new Schema<IGcpCredential>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true },
    propertyUrl: { type: String, required: true },
    clientEmail: { type: String, required: true },
    encryptedJson: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    dailyUsage: { type: Number, default: 0 },
    dailyUsageResetAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const GcpCredential: Model<IGcpCredential> =
  mongoose.models.GcpCredential ??
  mongoose.model<IGcpCredential>("GcpCredential", GcpCredentialSchema);
