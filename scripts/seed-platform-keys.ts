/**
 * Import platform GCP keys from PLATFORM_GCP_KEYS_JSON or PLATFORM_GCP_SERVICE_ACCOUNT_JSON
 * Run: npx tsx scripts/seed-platform-keys.ts
 */
import "../lib/load-env";
import { connectDB } from "../lib/db/mongodb";
import { syncPlatformKeysFromEnv } from "../lib/services/platform-key-pool";
import { PlatformGcpKey } from "../models/PlatformGcpKey";

async function main() {
  await connectDB();
  const added = await syncPlatformKeysFromEnv();
  const total = await PlatformGcpKey.countDocuments({ isActive: true });
  console.log(`[seed-platform-keys] Added ${added} key(s). Active platform keys: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
