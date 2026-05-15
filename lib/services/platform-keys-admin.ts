import { connectDB } from "@/lib/db/mongodb";
import { encryptJson } from "@/lib/crypto/credentials";
import { validateServiceAccountJson } from "@/lib/services/google-indexing";
import { PlatformGcpKey } from "@/models";

export const PLATFORM_KEY_DAILY_LIMIT = 200;

export type PlatformKeyPublic = {
  id: string;
  label: string;
  clientEmail: string;
  isActive: boolean;
  dailyUsage: number;
  dailyLimit: number;
  dailyUsageResetAt: string;
  remainingToday: number;
  createdAt: string;
};

function toPublic(row: {
  _id: { toString(): string };
  label: string;
  clientEmail: string;
  isActive: boolean;
  dailyUsage: number;
  dailyUsageResetAt: Date;
  createdAt: Date;
}): PlatformKeyPublic {
  const remaining = Math.max(0, PLATFORM_KEY_DAILY_LIMIT - row.dailyUsage);
  return {
    id: row._id.toString(),
    label: row.label,
    clientEmail: row.clientEmail,
    isActive: row.isActive,
    dailyUsage: row.dailyUsage,
    dailyLimit: PLATFORM_KEY_DAILY_LIMIT,
    dailyUsageResetAt: row.dailyUsageResetAt.toISOString(),
    remainingToday: remaining,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPlatformKeys(): Promise<{
  keys: PlatformKeyPublic[];
  summary: {
    totalKeys: number;
    activeKeys: number;
    totalDailyCapacity: number;
    remainingToday: number;
    usedToday: number;
  };
}> {
  await connectDB();
  const rows = await PlatformGcpKey.find().sort({ dailyUsage: 1, createdAt: -1 }).lean();
  const keys = rows.map(toPublic);

  const activeKeys = keys.filter((k) => k.isActive);
  const totalDailyCapacity = activeKeys.length * PLATFORM_KEY_DAILY_LIMIT;
  const usedToday = activeKeys.reduce((s, k) => s + k.dailyUsage, 0);
  const remainingToday = activeKeys.reduce((s, k) => s + k.remainingToday, 0);

  return {
    keys,
    summary: {
      totalKeys: keys.length,
      activeKeys: activeKeys.length,
      totalDailyCapacity,
      remainingToday,
      usedToday,
    },
  };
}

export async function createPlatformKey(
  label: string,
  serviceAccountJson: string
): Promise<PlatformKeyPublic> {
  await connectDB();
  const validation = validateServiceAccountJson(serviceAccountJson);
  if (!validation.valid || !validation.clientEmail) {
    throw new Error(validation.error ?? "Invalid service account JSON.");
  }

  const exists = await PlatformGcpKey.findOne({ clientEmail: validation.clientEmail });
  if (exists) {
    throw new Error(`Key for ${validation.clientEmail} already exists in the pool.`);
  }

  const row = await PlatformGcpKey.create({
    label: label.trim() || validation.clientEmail,
    clientEmail: validation.clientEmail,
    encryptedJson: encryptJson(serviceAccountJson),
    isActive: true,
  });

  return toPublic(row);
}

export async function updatePlatformKey(
  id: string,
  updates: { label?: string; isActive?: boolean }
): Promise<PlatformKeyPublic | null> {
  await connectDB();
  const row = await PlatformGcpKey.findByIdAndUpdate(
    id,
    {
      ...(updates.label !== undefined ? { label: updates.label.trim() } : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
    },
    { new: true }
  );
  return row ? toPublic(row) : null;
}

export async function deletePlatformKey(id: string): Promise<boolean> {
  await connectDB();
  const result = await PlatformGcpKey.findByIdAndDelete(id);
  return Boolean(result);
}

export async function resetPlatformKeyUsage(id: string): Promise<PlatformKeyPublic | null> {
  await connectDB();
  const row = await PlatformGcpKey.findByIdAndUpdate(
    id,
    { dailyUsage: 0, dailyUsageResetAt: new Date() },
    { new: true }
  );
  return row ? toPublic(row) : null;
}
