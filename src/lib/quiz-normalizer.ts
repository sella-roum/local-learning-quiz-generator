export interface NormalizeGeneratedQuizDefaults {
  fileId?: number;
  fileName?: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export function normalizeGeneratedQuiz(
  input: unknown,
  defaults?: NormalizeGeneratedQuizDefaults
): { quiz: GenerateQuizNormalized | null; reason?: string } {
  if (!input || typeof input !== "object") {
    return { quiz: null, reason: "input is not an object" };
  }

  const raw = input as Record<string, unknown>;

  const question =
    typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) {
    return { quiz: null, reason: "question is empty" };
  }

  if (!Array.isArray(raw.options)) {
    return { quiz: null, reason: "options is not an array" };
  }

  if (raw.options.length !== 4) {
    return { quiz: null, reason: "options.length !== 4" };
  }

  const options: string[] = [];
  for (let i = 0; i < raw.options.length; i++) {
    const opt = raw.options[i];
    const trimmed = (opt != null ? String(opt) : "").trim();
    if (!trimmed) {
      return { quiz: null, reason: `option[${i}] is empty` };
    }
    options.push(trimmed);
  }

  const correctOptionIndex = raw.correctOptionIndex;
  if (
    typeof correctOptionIndex !== "number" ||
    !Number.isInteger(correctOptionIndex) ||
    correctOptionIndex < 0 ||
    correctOptionIndex > 3
  ) {
    return { quiz: null, reason: "correctOptionIndex is invalid" };
  }

  const explanation =
    typeof raw.explanation === "string" ? raw.explanation : "";

  const categoryVal =
    typeof raw.category === "string" && raw.category.trim() !== ""
      ? raw.category.trim()
      : defaults?.category || "一般";

  const difficultyVal =
    typeof raw.difficulty === "string" &&
    ["easy", "medium", "hard"].includes(raw.difficulty)
      ? (raw.difficulty as "easy" | "medium" | "hard")
      : defaults?.difficulty || "medium";

  const keyword = typeof raw.keyword === "string" ? raw.keyword : "";

  const id =
    typeof raw.id === "string" && raw.id.trim() !== ""
      ? raw.id
      : crypto.randomUUID();

  return {
    quiz: {
      id,
      fileId: defaults?.fileId,
      fileName: defaults?.fileName,
      question,
      correctOptionIndex,
      options,
      explanation,
      category: categoryVal,
      difficulty: difficultyVal,
      keyword,
    },
  };
}

export interface GenerateQuizNormalized {
  id: string;
  fileId: number | undefined;
  fileName: string | undefined;
  question: string;
  correctOptionIndex: number;
  options: string[];
  explanation: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  keyword: string;
}

export function normalizeGeneratedQuizzes(
  inputs: unknown[],
  defaults?: NormalizeGeneratedQuizDefaults
): {
  quizzes: GenerateQuizNormalized[];
  rejectedCount: number;
} {
  let rejectedCount = 0;
  const quizzes: GenerateQuizNormalized[] = [];

  for (const input of inputs) {
    const result = normalizeGeneratedQuiz(input, defaults);
    if (result.quiz) {
      quizzes.push(result.quiz);
    } else {
      rejectedCount++;
    }
  }

  return { quizzes, rejectedCount };
}
