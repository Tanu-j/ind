import { connectDB } from "@/lib/db/mongodb";
import { decryptJson, encryptJson } from "@/lib/crypto/credentials";
import { validateServiceAccountJson } from "@/lib/services/google-indexing";
import { PlatformGcpKey, GcpCredential } from "@/models";
import type { IGcpCredential } from "@/models/GcpCredential";
import type { IPlatformGcpKey } from "@/models/PlatformGcpKey";

const DAILY_LIMIT = 200;

export type ResolvedCredential = {
  id: string;
  json: string;
  source: "user" | "platform";
  propertyUrl?: string;
  record?: InstanceType<typeof GcpCredential>;
  platformRecord?: InstanceType<typeof PlatformGcpKey>;
};

export async function syncPlatformKeysFromEnv(): Promise<number> {
  await connectDB();
  const raw = process.env.PLATFORM_GCP_KEYS_JSON;
  if (!raw?.trim()) return 0;

  let keys: string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    keys = Array.isArray(parsed) ? parsed.map(String) : [raw];
  } catch {
    keys = [raw];
  }

  let added = 0;
  for (let i = 0; i < keys.length; i++) {
    const json = keys[i].trim();
    if (!json) continue;
    const v = validateServiceAccountJson(json);
    if (!v.valid || !v.clientEmail) continue;

    const exists = await PlatformGcpKey.findOne({ clientEmail: v.clientEmail });
    if (exists) continue;

    await PlatformGcpKey.create({
      label: `Platform key ${i + 1}`,
      clientEmail: v.clientEmail,
      encryptedJson: encryptJson(json),
      isActive: true,
    });
    added++;
  }
  return added;
}

async function resetPlatformUsageIfNeeded(key: InstanceType<typeof PlatformGcpKey>): Promise<void> {
  const now = new Date();
  if (now.getTime() - new Date(key.dailyUsageResetAt).getTime() > 24 * 60 * 60 * 1000) {
    key.dailyUsage = 0;
    key.dailyUsageResetAt = now;
    await key.save();
  }
}

async function pickPlatformKey(): Promise<InstanceType<typeof PlatformGcpKey> | null> {
  await syncPlatformKeysFromEnv();

  const single = process.env.PLATFORM_GCP_SERVICE_ACCOUNT_JSON?.trim();
  if (single) {
    const v = validateServiceAccountJson(single);
    if (v.valid) {
      let row = await PlatformGcpKey.findOne({ clientEmail: v.clientEmail });
      if (!row) {
        row = await PlatformGcpKey.create({
          label: "Platform env key",
          clientEmail: v.clientEmail!,
          encryptedJson: encryptJson(single),
          isActive: true,
        });
      }
    }
  }

  const keys = await PlatformGcpKey.find({ isActive: true }).sort({ dailyUsage: 1 });
  for (const key of keys) {
    await resetPlatformUsageIfNeeded(key);
    if (key.dailyUsage < DAILY_LIMIT) return key;
  }
  return null;
}

export async function resolveGcpCredential(userId: string): Promise<ResolvedCredential | null> {
  await connectDB();

  const userCred = await GcpCredential.findOne({ userId, isActive: true }).sort({
    dailyUsage: 1,
  });

  if (userCred) {
    const resetAt = new Date(userCred.dailyUsageResetAt);
    if (Date.now() - resetAt.getTime() > 86400000) {
      userCred.dailyUsage = 0;
      userCred.dailyUsageResetAt = new Date();
      await userCred.save();
    }
    if (userCred.dailyUsage < DAILY_LIMIT) {
      return {
        id: userCred._id.toString(),
        json: decryptJson(userCred.encryptedJson),
        source: "user",
        propertyUrl: userCred.propertyUrl,
        record: userCred,
      };
    }
  }

  const platformKey = await pickPlatformKey();
  if (platformKey) {
    return {
      id: platformKey._id.toString(),
      json: decryptJson(platformKey.encryptedJson),
      source: "platform",
      platformRecord: platformKey,
    };
  }

  return null;
}

export async function incrementCredentialUsage(resolved: ResolvedCredential): Promise<void> {
  if (resolved.source === "user" && resolved.record) {
    resolved.record.dailyUsage += 1;
    await resolved.record.save();
  } else if (resolved.source === "platform" && resolved.platformRecord) {
    resolved.platformRecord.dailyUsage += 1;
    await resolved.platformRecord.save();
  } else if (resolved.source === "platform" && resolved.id) {
    await PlatformGcpKey.findByIdAndUpdate(resolved.id, { $inc: { dailyUsage: 1 } });
  }
}

export async function resetDailyUsageIfNeeded(
  credential: InstanceType<typeof GcpCredential>
): Promise<void> {
  const now = new Date();
  if (now.getTime() - new Date(credential.dailyUsageResetAt).getTime() > 86400000) {
    credential.dailyUsage = 0;
    credential.dailyUsageResetAt = now;
    await credential.save();
  }
}

export async function isPlatformCredentialConfigured(): Promise<boolean> {
  await connectDB();
  await syncPlatformKeysFromEnv();
  const count = await PlatformGcpKey.countDocuments({ isActive: true });
  return count > 0 || Boolean(process.env.PLATFORM_GCP_SERVICE_ACCOUNT_JSON?.trim());
}
