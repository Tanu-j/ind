import type { ISeedDomain } from "@/models/SeedDomain";

export interface CrawlTrapItem {
  url: string;
  title: string;
  description: string;
  pubDate: string;
}

export function buildRssFeed(
  seed: Pick<ISeedDomain, "baseUrl" | "name">,
  items: CrawlTrapItem[]
): string {
  const channelLink = seed.baseUrl.replace(/\/$/, "");
  const itemXml = items
    .map(
      (item) => `
    <item>
      <title><![CDATA[${escapeXml(item.title)}]]></title>
      <link>${escapeXml(item.url)}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${escapeXml(item.url)}-${Date.now()}</guid>
    </item>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(seed.name)}</title>
    <link>${channelLink}</link>
    <description>WhiteIndexWay live discovery feed</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${itemXml}
  </channel>
</rss>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateCrawlTrapContent(
  targetUrl: string,
  relatedUrls: string[] = []
): CrawlTrapItem {
  let hostname = "resource";
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    /* keep default */
  }

  const title = `Network update: ${hostname}`;
  const others = relatedUrls
    .filter((u) => u && u !== targetUrl)
    .slice(0, 5)
    .map((u) => `<a href="${escapeXml(u)}">${escapeXml(u)}</a>`)
    .join(" · ");

  const hubLinks = others
    ? ` Related resources in this index: ${others}.`
    : "";

  const description = `Latest verified web resource reference for ${hostname}. Source: <a href="${targetUrl}">${targetUrl}</a>${hubLinks}`;

  return {
    url: targetUrl,
    title,
    description,
    pubDate: new Date().toUTCString(),
  };
}

export async function publishToSeedDomain(
  seed: ISeedDomain,
  item: CrawlTrapItem
): Promise<{ success: boolean; error?: string }> {
  if (!seed.apiEndpoint) {
    return { success: true };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (seed.apiToken) {
      headers.Authorization = `Bearer ${seed.apiToken}`;
    }

    const response = await fetch(seed.apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: item.title,
        content: item.description,
        link: item.url,
        status: "publish",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      return { success: true };
    }

    return { success: false, error: `Seed publish failed: ${response.status}` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Seed publish error.",
    };
  }
}

export async function pingFeedDiscovery(feedUrl: string): Promise<void> {
  const pingTargets = [
    "https://rpc.pingomatic.com/",
    "https://ping.feedburner.com/ping",
  ];

  const siteName = escapeXml("WhiteIndexWay Feed");
  const safeFeedUrl = escapeXml(feedUrl);
  const body = `<?xml version="1.0"?>
<methodCall>
  <methodName>weblogUpdates.ping</methodName>
  <params>
    <param><value><string>${siteName}</string></value></param>
    <param><value><string>${safeFeedUrl}</string></value></param>
  </params>
</methodCall>`;

  await Promise.allSettled(
    pingTargets.map((endpoint) =>
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body,
        signal: AbortSignal.timeout(8000),
      })
    )
  );
}
