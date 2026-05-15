import { describe, expect, it } from "vitest";
import { classifyIndexingApiError } from "@/lib/services/google-indexing-errors";

describe("classifyIndexingApiError", () => {
  it("flags quota as retryable", () => {
    const c = classifyIndexingApiError("Quota exceeded", undefined);
    expect(c.kind).toBe("QUOTA_OR_RATE_LIMIT");
    expect(c.retryable).toBe(true);
  });

  it("flags 429", () => {
    const c = classifyIndexingApiError("n/a", 429);
    expect(c.kind).toBe("QUOTA_OR_RATE_LIMIT");
  });

  it("flags permission", () => {
    const c = classifyIndexingApiError("Permission denied.", 403);
    expect(c.kind).toBe("PERMISSION");
    expect(c.retryable).toBe(false);
  });
});
