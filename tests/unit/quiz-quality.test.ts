import { describe, it, expect } from "vitest";
import { checkQuizQuality, summarizeQuizQuality } from "@/lib/quiz-quality";
import type { GenerateQuizNormalized } from "@/lib/quiz-normalizer";

function makeQuiz(overrides: Partial<GenerateQuizNormalized> = {}): GenerateQuizNormalized {
  return {
    id: "test-id",
    fileId: undefined,
    fileName: undefined,
    question: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correctOptionIndex: 1,
    explanation: "Paris is the capital of France.",
    category: "一般",
    difficulty: "medium",
    keyword: "",
    ...overrides,
  };
}

describe("checkQuizQuality", () => {
  it("passes a valid quiz with no issues", () => {
    const report = checkQuizQuality(makeQuiz());
    expect(report.hasErrors).toBe(false);
    expect(report.hasWarnings).toBe(false);
    expect(report.issues).toHaveLength(0);
  });

  it("reports error for empty question", () => {
    const report = checkQuizQuality(makeQuiz({ question: "" }));
    expect(report.hasErrors).toBe(true);
    expect(report.issues.some((i) => i.code === "EMPTY_QUESTION")).toBe(true);
  });

  it("reports warning for missing explanation", () => {
    const report = checkQuizQuality(makeQuiz({ explanation: "解説なし" }));
    expect(report.hasWarnings).toBe(true);
    expect(report.issues.some((i) => i.code === "MISSING_EXPLANATION")).toBe(true);
  });

  it("reports error for empty option", () => {
    const report = checkQuizQuality(
      makeQuiz({ options: ["London", "", "Berlin", "Madrid"] })
    );
    expect(report.hasErrors).toBe(true);
    expect(report.issues.some((i) => i.code === "EMPTY_OPTION")).toBe(true);
  });

  it("does not report SHORT_OPTION for empty options (already error)", () => {
    const report = checkQuizQuality(
      makeQuiz({ options: ["London", "", "Berlin", "Madrid"] })
    );
    const shortOptionIssues = report.issues.filter((i) => i.code === "SHORT_OPTION");
    expect(shortOptionIssues).toHaveLength(0);
  });

  it("reports error for duplicate options", () => {
    const report = checkQuizQuality(
      makeQuiz({ options: ["London", "London", "Berlin", "Madrid"] })
    );
    expect(report.hasErrors).toBe(true);
    expect(report.issues.some((i) => i.code === "DUPLICATE_OPTIONS")).toBe(true);
  });

  it("reports warning for short question", () => {
    const report = checkQuizQuality(makeQuiz({ question: "Hi?" }));
    expect(report.hasWarnings).toBe(true);
    expect(report.issues.some((i) => i.code === "SHORT_QUESTION")).toBe(true);
  });

  it("reports warning for short option", () => {
    const report = checkQuizQuality(
      makeQuiz({ options: ["A", "Paris", "Berlin", "Madrid"] })
    );
    expect(report.hasWarnings).toBe(true);
    expect(report.issues.some((i) => i.code === "SHORT_OPTION")).toBe(true);
  });
});

describe("summarizeQuizQuality", () => {
  it("summarizes multiple quizzes", () => {
    const quizzes = [
      makeQuiz(),
      makeQuiz({ question: "" }), // error
      makeQuiz({ explanation: "解説なし" }), // warning
    ];
    const summary = summarizeQuizQuality(quizzes);
    expect(summary.errorCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(Object.keys(summary.quizIssueCounts)).toHaveLength(2);
  });
});
