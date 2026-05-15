import { describe, expect, it } from "vitest";
import { buildRssFeed, generateCrawlTrapContent } from "@/lib/services/crawl-trap";

describe("generateCrawlTrapContent", () => {
  it("builds item from URL", () => {
    const item = generateCrawlTrapContent("https://example.com/page");
    expect(item.url).toBe("https://example.com/page");
    expect(item.title).toContain("example.com");
    expect(item.description).toContain("https://example.com/page");
  });
});

describe("buildRssFeed", () => {
  it("returns valid RSS XML", () => {
    const xml = buildRssFeed(
      { name: "Test Feed", baseUrl: "https://feed.test" },
      [
        {
          url: "https://example.com/a",
          title: "Title A",
          description: "Desc A",
          pubDate: new Date().toUTCString(),
        },
      ]
    );
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain("https://example.com/a");
  });
});
