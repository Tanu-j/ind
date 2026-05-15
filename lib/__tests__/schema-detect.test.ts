import { describe, expect, it } from "vitest";
import { detectSchemaTypes } from "@/lib/services/schema-detect";

describe("detectSchemaTypes", () => {
  it("finds JobPosting in JSON-LD", () => {
    const html = `<script type="application/ld+json">{"@type":"JobPosting","title":"Dev"}</script>`;
    expect(detectSchemaTypes(html)).toContain("JobPosting");
  });

  it("returns empty for plain HTML", () => {
    expect(detectSchemaTypes("<html><body>hi</body></html>")).toEqual([]);
  });
});
