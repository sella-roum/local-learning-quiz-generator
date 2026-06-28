import { describe, it, expect } from "vitest";
import {
  convertQuizToExportFormat,
  generateExportJson,
  validateImportedJson,
  convertImportedQuizToDbFormat,
  createQuizDuplicateKey,
  type QuizExportFile,
} from "@/lib/quiz-export-import";
import type { Quiz } from "@/lib/db";

function makeQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: 1,
    fileId: undefined,
    category: "一般",
    question: "Test question?",
    options: ["A", "B", "C", "D"],
    correctOptionIndex: 0,
    explanation: "Test explanation.",
    createdAt: new Date("2026-06-28T12:00:00Z"),
    updatedAt: new Date("2026-06-28T12:00:00Z"),
    ...overrides,
  };
}

describe("convertQuizToExportFormat", () => {
  it("converts quiz to export format without dates", () => {
    const quiz = makeQuiz();
    const exported = convertQuizToExportFormat(quiz);
    expect(exported.question).toBe("Test question?");
    expect(exported.options).toEqual(["A", "B", "C", "D"]);
    expect(exported.correctOptionIndex).toBe(0);
    expect(exported.explanation).toBe("Test explanation.");
    // Should NOT contain date fields
    const record = exported as unknown as Record<string, unknown>;
    expect(record.createdAt).toBeUndefined();
    expect(record.updatedAt).toBeUndefined();
  });
});

describe("generateExportJson", () => {
  it("generates valid JSON with ISO date string", () => {
    const quizzes = [makeQuiz()];
    const json = generateExportJson(quizzes);
    const parsed: QuizExportFile = JSON.parse(json);
    expect(parsed.version).toBe("1.0");
    expect(parsed.exportedAt).toBeTypeOf("string");
    // exportedAt should be a valid ISO string (parseable and round-trippable)
    const parsedTs = Date.parse(parsed.exportedAt);
    expect(Number.isNaN(parsedTs)).toBe(false);
    expect(new Date(parsedTs).toISOString()).toBe(parsed.exportedAt);
    expect(parsed.quizzes).toHaveLength(1);
    expect(parsed.quizzes[0].question).toBe("Test question?");
  });
});

describe("validateImportedJson", () => {
  it("validates a correct import file", () => {
    const data: QuizExportFile = {
      version: "1.0",
      exportedAt: "2026-06-28T00:00:00.000Z",
      quizzes: [
        {
          category: "一般",
          question: "Q1?",
          options: ["A", "B", "C", "D"],
          correctOptionIndex: 0,
          explanation: "E1",
        },
      ],
    };
    const result = validateImportedJson(JSON.stringify(data));
    expect(result.valid).toBe(true);
  });

  it("rejects unsupported version", () => {
    const data = { version: "0.5", exportedAt: "2026-01-01T00:00:00Z", quizzes: [] };
    const result = validateImportedJson(JSON.stringify(data));
    expect(result.valid).toBe(false);
  });

  it("rejects missing quizzes array", () => {
    const data = { version: "1.0", exportedAt: "2026-01-01T00:00:00Z" };
    const result = validateImportedJson(JSON.stringify(data));
    expect(result.valid).toBe(false);
  });

  it("rejects invalid JSON", () => {
    const result = validateImportedJson("not json");
    expect(result.valid).toBe(false);
  });
});

describe("convertImportedQuizToDbFormat", () => {
  it("creates DB record with fresh Date objects", () => {
    const imported = {
      category: "Science",
      question: "Test?",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 2,
      explanation: "Exp",
    };
    const dbQuiz = convertImportedQuizToDbFormat(imported);
    expect(dbQuiz.question).toBe("Test?");
    expect(dbQuiz.category).toBe("Science");
    expect(dbQuiz.createdAt).toBeInstanceOf(Date);
    expect(dbQuiz.updatedAt).toBeInstanceOf(Date);
    // createdAt/updatedAt should be recent (within 10s)
    const now = Date.now();
    expect(dbQuiz.createdAt.getTime()).toBeGreaterThan(now - 10000);
    expect(dbQuiz.updatedAt.getTime()).toBeGreaterThan(now - 10000);
  });
});

describe("createQuizDuplicateKey", () => {
  it("creates stable key from quiz content", () => {
    const key1 = createQuizDuplicateKey({
      question: "  What is this?  ",
      options: ["  A  ", "B", "C", "D"],
      correctOptionIndex: 0,
    });
    const key2 = createQuizDuplicateKey({
      question: "What is this?",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
    });
    // Whitespace should be trimmed, so keys should be equal
    expect(key1).toBe(key2);
  });

  it("produces different keys for different questions", () => {
    const key1 = createQuizDuplicateKey({
      question: "Question A",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
    });
    const key2 = createQuizDuplicateKey({
      question: "Question B",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
    });
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different correct indexes", () => {
    const key1 = createQuizDuplicateKey({
      question: "Q",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
    });
    const key2 = createQuizDuplicateKey({
      question: "Q",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 1,
    });
    expect(key1).not.toBe(key2);
  });

  it("handles undefined options gracefully", () => {
    const key = createQuizDuplicateKey({
      question: "Q",
      options: undefined,
      correctOptionIndex: 0,
    });
    const parsed = JSON.parse(key);
    expect(parsed.options).toEqual([]);
  });

  it("handles non-string options elements gracefully", () => {
    const key = createQuizDuplicateKey({
      question: "Q",
      options: [42, true, null] as unknown as string[],
      correctOptionIndex: 0,
    });
    const parsed = JSON.parse(key);
    expect(parsed.options).toEqual(["", "", ""]);
  });

  it("handles non-string question gracefully", () => {
    const key = createQuizDuplicateKey({
      question: 123 as unknown as string,
      options: ["A", "B"],
      correctOptionIndex: 0,
    });
    const parsed = JSON.parse(key);
    expect(parsed.question).toBe("");
  });

  it("handles non-number correctOptionIndex gracefully", () => {
    const key = createQuizDuplicateKey({
      question: "Q",
      options: ["A", "B"],
      correctOptionIndex: "0" as unknown as number,
    });
    const parsed = JSON.parse(key);
    expect(parsed.correctOptionIndex).toBe(-1);
  });
});
