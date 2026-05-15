import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUserIndexNow extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  host: string;
  key: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserIndexNowSchema = new Schema<IUserIndexNow>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    host: { type: String, required: true },
    key: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserIndexNow: Model<IUserIndexNow> =
  mongoose.models.UserIndexNow ??
  mongoose.model<IUserIndexNow>("UserIndexNow", UserIndexNowSchema);
