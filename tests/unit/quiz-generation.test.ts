import { describe, it, expect } from "vitest";
import { distributeQuizCount, trimQuizzesToCount } from "@/lib/quiz-generation";

describe("distributeQuizCount", () => {
  it("distributes 10 items across 3 files evenly", () => {
    expect(distributeQuizCount(10, 3)).toEqual([4, 3, 3]);
  });

  it("distributes 3 items across 5 files", () => {
    expect(distributeQuizCount(3, 5)).toEqual([1, 1, 1, 0, 0]);
  });

  it("handles single file", () => {
    expect(distributeQuizCount(5, 1)).toEqual([5]);
  });

  it("handles single item", () => {
    expect(distributeQuizCount(1, 3)).toEqual([1, 0, 0]);
  });

  it("handles equal distribution", () => {
    expect(distributeQuizCount(6, 3)).toEqual([2, 2, 2]);
  });

  it("returns empty array for zero totalCount", () => {
    expect(distributeQuizCount(0, 3)).toEqual([]);
  });

  it("returns empty array for negative totalCount", () => {
    expect(distributeQuizCount(-1, 3)).toEqual([]);
  });

  it("returns empty array for zero fileCount", () => {
    expect(distributeQuizCount(5, 0)).toEqual([]);
  });

  it("returns empty array for negative fileCount", () => {
    expect(distributeQuizCount(5, -1)).toEqual([]);
  });

  it("returns empty array for non-integer totalCount", () => {
    expect(distributeQuizCount(3.5, 2)).toEqual([]);
  });

  it("returns empty array for non-integer fileCount", () => {
    expect(distributeQuizCount(5, 2.5)).toEqual([]);
  });
});

describe("trimQuizzesToCount", () => {
  it("trims array to the specified count", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(trimQuizzesToCount(arr, 3)).toEqual([1, 2, 3]);
  });

  it("returns full array if count exceeds length", () => {
    const arr = [1, 2];
    expect(trimQuizzesToCount(arr, 5)).toEqual([1, 2]);
  });

  it("returns empty array for zero count", () => {
    expect(trimQuizzesToCount([1, 2, 3], 0)).toEqual([]);
  });

  it("returns empty array for negative count", () => {
    expect(trimQuizzesToCount([1, 2, 3], -1)).toEqual([]);
  });

  it("returns empty array for non-integer count", () => {
    expect(trimQuizzesToCount([1, 2, 3], 2.5)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(trimQuizzesToCount([], 5)).toEqual([]);
  });
});
