import { connectDB } from "@/lib/db/mongodb";
import { UserIndexNow } from "@/models";
import type { IndexNowConfig } from "@/lib/services/indexnow";

export async function resolveIndexNowConfig(userId: string): Promise<IndexNowConfig | null> {
  await connectDB();
  const row = await UserIndexNow.findOne({ userId, isActive: true });
  if (row) {
    return {
      host: row.host,
      key: row.key,
      keyLocation: `https://${row.host.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${row.key}.txt`,
    };
  }

  const host = process.env.INDEXNOW_HOST;
  const key = process.env.INDEXNOW_KEY;
  if (host && key) return { host, key };
  return null;
}
