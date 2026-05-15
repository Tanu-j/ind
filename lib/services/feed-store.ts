import { FeedItem, SeedDomain } from "@/models";
import type { CrawlTrapItem } from "@/lib/services/crawl-trap";

const MAX_FEED_ITEMS = 500;

export async function appendFeedItem(
  seedDomainId: string,
  item: CrawlTrapItem
): Promise<void> {
  await FeedItem.create({
    seedDomainId,
    url: item.url,
    title: item.title,
    description: item.description,
    pubDate: new Date(item.pubDate),
  });

  const count = await FeedItem.countDocuments({ seedDomainId });
  if (count > MAX_FEED_ITEMS) {
    const excess = count - MAX_FEED_ITEMS;
    const oldest = await FeedItem.find({ seedDomainId })
      .sort({ createdAt: 1 })
      .limit(excess)
      .select("_id");
    await FeedItem.deleteMany({ _id: { $in: oldest.map((d) => d._id) } });
  }
}

export async function getRecentFeedUrls(seedDomainId: string, limit = 8): Promise<string[]> {
  const docs = await FeedItem.find({ seedDomainId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("url")
    .lean();
  return docs.map((d) => d.url);
}

export async function getActiveFeedItems(limit = 100): Promise<{
  seed: { name: string; baseUrl: string };
  items: CrawlTrapItem[];
}> {
  const seed = await SeedDomain.findOne({ isActive: true }).sort({ updatedAt: -1 });
  if (!seed) {
    return { seed: { name: "WhiteIndexWay", baseUrl: process.env.APP_URL ?? "https://localhost" }, items: [] };
  }

  const docs = await FeedItem.find({ seedDomainId: seed._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return {
    seed: { name: seed.name, baseUrl: seed.baseUrl },
    items: docs.map((d) => ({
      url: d.url,
      title: d.title,
      description: d.description,
      pubDate: new Date(d.pubDate).toUTCString(),
    })),
  };
}
