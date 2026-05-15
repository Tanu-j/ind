import { connectDB } from "@/lib/db/mongodb";
import { decryptJson } from "@/lib/crypto/credentials";
import { GcpCredential } from "@/models";
import type { IGcpCredential } from "@/models/GcpCredential";

export type ResolvedCredential = {
  id: string;
  json: string;
  source: "user" | "platform";
  record?: InstanceType<typeof GcpCredential>;
};

/**
 * Resolves GCP credentials: user's active key first, then platform env key.
 * Commercial indexers use shared platform keys so users only paste URLs.
 */
export async function resolveGcpCredential(
  userId: string
): Promise<ResolvedCredential | null> {
  await connectDB();

  const userCred = await GcpCredential.findOne({
    userId,
    isActive: true,
  }).sort({ dailyUsage: 1 });

  if (userCred) {
    return {
      id: userCred._id.toString(),
      json: decryptJson(userCred.encryptedJson),
      source: "user",
      record: userCred,
    };
  }

  const platformJson = process.env.PLATFORM_GCP_SERVICE_ACCOUNT_JSON;
  if (platformJson?.trim()) {
    return {
      id: "platform",
      json: platformJson.trim(),
      source: "platform",
    };
  }

  return null;
}

export async function incrementCredentialUsage(
  resolved: ResolvedCredential
): Promise<void> {
  if (resolved.source === "user" && resolved.record) {
    resolved.record.dailyUsage += 1;
    await resolved.record.save();
  }
}

export async function resetDailyUsageIfNeeded(
  credential: InstanceType<typeof GcpCredential>
): Promise<void> {
  const now = new Date();
  const resetAt = new Date(credential.dailyUsageResetAt);
  if (now.getTime() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
    credential.dailyUsage = 0;
    credential.dailyUsageResetAt = now;
    await credential.save();
  }
}

export function isPlatformCredentialConfigured(): boolean {
  return Boolean(process.env.PLATFORM_GCP_SERVICE_ACCOUNT_JSON?.trim());
}
