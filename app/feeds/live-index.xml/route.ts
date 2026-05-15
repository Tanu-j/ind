import { connectDB } from "@/lib/db/mongodb";
import { buildRssFeed } from "@/lib/services/crawl-trap";
import { getActiveFeedItems } from "@/lib/services/feed-store";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const { seed, items } = await getActiveFeedItems(100);
  const xml = buildRssFeed(seed, items);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
