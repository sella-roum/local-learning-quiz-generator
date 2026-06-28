import { describe, it, expect } from "vitest";
import {
  validatePayloadSize,
  getMaxFileBytes,
  getMaxBase64Chars,
  assertTextWithinLimit,
  assertFileSizeWithinLimit,
  AI_INPUT_LIMITS,
  AI_INPUT_BASE64_LIMITS,
} from "@/lib/limits";

describe("validatePayloadSize", () => {
  it("returns null for text content within limit", () => {
    const shortText = "Hello, World!";
    expect(validatePayloadSize("text/plain", shortText)).toBeNull();
  });

  it("returns error for text content exceeding limit", () => {
    const longText = "x".repeat(AI_INPUT_LIMITS.maxTextChars + 1);
    const result = validatePayloadSize("text/plain", longText);
    expect(result).not.toBeNull();
    expect(result).toContain("長すぎます");
  });

  it("returns null for PDF content within limit", () => {
    const content = "x".repeat(1000);
    expect(validatePayloadSize("application/pdf", content)).toBeNull();
  });

  it("returns error for PDF content exceeding limit", () => {
    const content = "x".repeat(AI_INPUT_BASE64_LIMITS.maxPdfBase64Chars + 1);
    const result = validatePayloadSize("application/pdf", content);
    expect(result).not.toBeNull();
    expect(result).toContain("大きすぎます");
  });

  it("returns null for image content within limit", () => {
    const content = "x".repeat(1000);
    expect(validatePayloadSize("image/jpeg", content)).toBeNull();
  });
});

describe("getMaxFileBytes", () => {
  it("returns limit for PDF", () => {
    expect(getMaxFileBytes("application/pdf")).toBe(AI_INPUT_LIMITS.maxPdfBytes);
  });

  it("returns limit for images", () => {
    expect(getMaxFileBytes("image/jpeg")).toBe(AI_INPUT_LIMITS.maxImageBytes);
    expect(getMaxFileBytes("image/png")).toBe(AI_INPUT_LIMITS.maxImageBytes);
  });

  it("returns null for unknown types", () => {
    expect(getMaxFileBytes("text/plain")).toBeNull();
  });
});

describe("assertTextWithinLimit", () => {
  it("does not throw for text within limit", () => {
    expect(() =>
      assertTextWithinLimit("short", AI_INPUT_LIMITS.maxTextChars, "Test")
    ).not.toThrow();
  });

  it("throws for text exceeding limit", () => {
    const longText = "x".repeat(AI_INPUT_LIMITS.maxTextChars + 1);
    expect(() =>
      assertTextWithinLimit(longText, AI_INPUT_LIMITS.maxTextChars, "Test")
    ).toThrow("長すぎます");
  });
});

describe("assertFileSizeWithinLimit", () => {
  it("does not throw for small PDF", () => {
    const file = new File(["x".repeat(1000)], "test.pdf", {
      type: "application/pdf",
    });
    expect(() => assertFileSizeWithinLimit(file)).not.toThrow();
  });

  it("throws for oversized PDF", () => {
    const file = new File(
      ["x".repeat(AI_INPUT_LIMITS.maxPdfBytes + 1)],
      "test.pdf",
      { type: "application/pdf" }
    );
    expect(() => assertFileSizeWithinLimit(file)).toThrow("大きすぎます");
  });
});
