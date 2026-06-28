import { describe, it, expect } from "vitest";
import { toDateOrNull, toIsoStringOrNull } from "@/lib/utils";

describe("toDateOrNull", () => {
  it("returns Date for Date input", () => {
    const date = new Date("2026-06-28T12:00:00Z");
    expect(toDateOrNull(date)).toEqual(date);
  });

  it("returns Date for ISO string input", () => {
    const result = toDateOrNull("2026-06-28T12:00:00.000Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2026-06-28T12:00:00.000Z");
  });

  it("returns Date for timestamp number input", () => {
    const timestamp = new Date("2026-06-28T12:00:00Z").getTime();
    const result = toDateOrNull(timestamp);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(timestamp);
  });

  it("returns null for invalid date string", () => {
    expect(toDateOrNull("not-a-date")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(toDateOrNull(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(toDateOrNull(undefined)).toBeNull();
  });

  it("returns null for object input", () => {
    expect(toDateOrNull({})).toBeNull();
  });

  it("returns null for boolean input", () => {
    expect(toDateOrNull(true)).toBeNull();
  });

  it("returns null for NaN date", () => {
    expect(toDateOrNull(new Date("invalid"))).toBeNull();
  });
});

describe("toIsoStringOrNull", () => {
  it("converts Date to ISO string", () => {
    const date = new Date("2026-06-28T12:00:00Z");
    expect(toIsoStringOrNull(date)).toBe("2026-06-28T12:00:00.000Z");
  });

  it("converts ISO string to ISO string", () => {
    expect(toIsoStringOrNull("2026-06-28T12:00:00.000Z")).toBe(
      "2026-06-28T12:00:00.000Z"
    );
  });

  it("returns null for invalid input", () => {
    expect(toIsoStringOrNull("not-a-date")).toBeNull();
  });

  it("returns null for null", () => {
    expect(toIsoStringOrNull(null)).toBeNull();
  });
});
