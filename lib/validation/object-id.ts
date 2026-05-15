import mongoose from "mongoose";

/** Validates a 24-char hex MongoDB ObjectId string. */
export function isValidObjectId(id: string): boolean {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return String(new mongoose.Types.ObjectId(id)) === id;
}
