import { describe, it, expect } from "vitest";
import { normalizeGeneratedQuiz, normalizeGeneratedQuizzes } from "@/lib/quiz-normalizer";

describe("normalizeGeneratedQuiz", () => {
  const validQuiz = {
    question: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correctOptionIndex: 1,
    explanation: "Paris is the capital of France.",
  };

  it("normalizes a valid quiz response", () => {
    const result = normalizeGeneratedQuiz(validQuiz);
    expect(result.quiz).not.toBeNull();
    expect(result.quiz?.question).toBe("What is the capital of France?");
    expect(result.quiz?.options).toEqual(["London", "Paris", "Berlin", "Madrid"]);
    expect(result.quiz?.correctOptionIndex).toBe(1);
  });

  it("rejects null input", () => {
    const result = normalizeGeneratedQuiz(null);
    expect(result.quiz).toBeNull();
  });

  it("rejects non-object input", () => {
    const result = normalizeGeneratedQuiz("string");
    expect(result.quiz).toBeNull();
  });

  it("rejects empty question", () => {
    const result = normalizeGeneratedQuiz({ ...validQuiz, question: "" });
    expect(result.quiz).toBeNull();
  });

  it("rejects whitespace-only question", () => {
    const result = normalizeGeneratedQuiz({ ...validQuiz, question: "   " });
    expect(result.quiz).toBeNull();
  });

  it("rejects non-array options", () => {
    const result = normalizeGeneratedQuiz({ ...validQuiz, options: "not array" });
    expect(result.quiz).toBeNull();
  });

  it("rejects options with wrong length", () => {
    const result = normalizeGeneratedQuiz({ ...validQuiz, options: ["A", "B"] });
    expect(result.quiz).toBeNull();
  });

  it("rejects empty option", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      options: ["London", "", "Berlin", "Madrid"],
    });
    expect(result.quiz).toBeNull();
  });

  it("rejects duplicate options", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      options: ["London", "London", "Berlin", "Madrid"],
    });
    expect(result.quiz).toBeNull();
  });

  it("rejects non-integer correctOptionIndex", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      correctOptionIndex: 1.5,
    });
    expect(result.quiz).toBeNull();
  });

  it("rejects out-of-range correctOptionIndex", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      correctOptionIndex: 10,
    });
    expect(result.quiz).toBeNull();
  });

  it("rejects negative correctOptionIndex", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      correctOptionIndex: -1,
    });
    expect(result.quiz).toBeNull();
  });

  it("fills missing explanation with '解説なし'", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      explanation: undefined,
    });
    expect(result.quiz?.explanation).toBe("解説なし");
  });

  it("fills empty explanation with '解説なし'", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      explanation: "",
    });
    expect(result.quiz?.explanation).toBe("解説なし");
  });

  it("fills missing category with '一般'", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      category: undefined,
    });
    expect(result.quiz?.category).toBe("一般");
  });

  it("normalizes string options with text property", () => {
    const result = normalizeGeneratedQuiz({
      ...validQuiz,
      options: [
        { text: "London" },
        { text: "Paris" },
        { text: "Berlin" },
        { text: "Madrid" },
      ],
    });
    expect(result.quiz?.options).toEqual(["London", "Paris", "Berlin", "Madrid"]);
  });

  it("applies defaults", () => {
    const result = normalizeGeneratedQuiz(validQuiz, {
      category: "Geography",
      difficulty: "hard",
    });
    expect(result.quiz?.category).toBe("Geography");
    expect(result.quiz?.difficulty).toBe("hard");
  });
});

describe("normalizeGeneratedQuizzes", () => {
  it("normalizes multiple quizzes and counts rejections", () => {
    const inputs = [
      {
        question: "Q1",
        options: ["A", "B", "C", "D"],
        correctOptionIndex: 0,
      },
      {
        question: "",
        options: ["A", "B", "C", "D"],
        correctOptionIndex: 0,
      },
      {
        question: "Q3",
        options: ["A", "B", "C", "D"],
        correctOptionIndex: 1,
      },
    ];
    const result = normalizeGeneratedQuizzes(inputs);
    expect(result.quizzes).toHaveLength(2);
    expect(result.rejectedCount).toBe(1);
  });
});
