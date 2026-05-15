import { connectDB } from "@/lib/db/mongodb";
import { BatchSitemap, User } from "@/models";

export function buildUrlSetXml(urls: string[]): string {
  const entries = urls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function saveBatchSitemap(
  batchId: string,
  userId: string,
  urls: string[]
): Promise<void> {
  await connectDB();
  await BatchSitemap.findOneAndUpdate(
    { batchId },
    { batchId, userId, urls },
    { upsert: true }
  );
}

export async function getBatchSitemapUrls(batchId: string): Promise<string[]> {
  await connectDB();
  const doc = await BatchSitemap.findOne({ batchId }).lean();
  return doc?.urls ?? [];
}

/** Public URL for batch sitemap — respects per-user `sitemapPublicBaseUrl` when set (CNAME to this app). */
export async function getBatchSitemapPublicUrl(
  batchId: string,
  userId?: string
): Promise<string> {
  let base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (userId) {
    await connectDB();
    const u = await User.findById(userId).select("sitemapPublicBaseUrl").lean();
    if (u?.sitemapPublicBaseUrl?.trim()) {
      base = u.sitemapPublicBaseUrl.replace(/\/$/, "");
    }
  }
  return `${base}/feeds/batch/${batchId}`;
}
