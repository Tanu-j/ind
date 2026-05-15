import { describe, expect, it } from "vitest";
import { isValidObjectId } from "@/lib/validation/object-id";

describe("isValidObjectId", () => {
  it("accepts valid 24-char hex ids", () => {
    expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
  });

  it("rejects invalid strings", () => {
    expect(isValidObjectId("not-valid")).toBe(false);
    expect(isValidObjectId("507f1f77bcf86cd79943901")).toBe(false);
  });
});
