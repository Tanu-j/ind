import { describe, expect, it } from "vitest";
import { parseUrlList, splitHybridUrls } from "@/lib/utils";

describe("parseUrlList", () => {
  it("parses valid URLs and deduplicates", () => {
    const raw = "https://a.com/1\nhttps://a.com/1\nhttps://b.com/2\n";
    expect(parseUrlList(raw)).toEqual(["https://a.com/1", "https://b.com/2"]);
  });

  it("skips invalid lines and non-http protocols", () => {
    const raw = "not-a-url\nftp://files.com/x\nhttps://ok.com\n";
    expect(parseUrlList(raw)).toEqual(["https://ok.com/"]);
  });

  it("rejects URLs longer than 2048 characters", () => {
    const long = "https://example.com/" + "a".repeat(2040);
    expect(parseUrlList(long)).toEqual([]);
  });
});

describe("splitHybridUrls", () => {
  it("splits by ratio", () => {
    const urls = ["a", "b", "c", "d", "e", "e", "g", "h", "i", "j"];
    const { api, crawlTrap } = splitHybridUrls(urls, 0.3);
    expect(api).toHaveLength(3);
    expect(crawlTrap).toHaveLength(7);
  });

  it("clamps ratio to 0–1", () => {
    const urls = ["a", "b", "c"];
    expect(splitHybridUrls(urls, -1).api).toHaveLength(0);
    expect(splitHybridUrls(urls, 2).api).toHaveLength(3);
  });
});
