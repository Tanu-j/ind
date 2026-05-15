import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPlatformGcpKey extends Document {
  _id: mongoose.Types.ObjectId;
  label: string;
  clientEmail: string;
  encryptedJson: string;
  isActive: boolean;
  dailyUsage: number;
  dailyUsageResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformGcpKeySchema = new Schema<IPlatformGcpKey>(
  {
    label: { type: String, required: true },
    clientEmail: { type: String, required: true },
    encryptedJson: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    dailyUsage: { type: Number, default: 0 },
    dailyUsageResetAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PlatformGcpKey: Model<IPlatformGcpKey> =
  mongoose.models.PlatformGcpKey ??
  mongoose.model<IPlatformGcpKey>("PlatformGcpKey", PlatformGcpKeySchema);
