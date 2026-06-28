export interface NormalizeGeneratedQuizDefaults {
  fileId?: number;
  fileName?: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
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

function createQuizId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeOptionValue(input: unknown): string | null {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed && trimmed !== "[object Object]") {
      return trimmed;
    }
    return null;
  }

  if (
    input &&
    typeof input === "object" &&
    "text" in input &&
    typeof (input as { text?: unknown }).text === "string"
  ) {
    const trimmed = (input as { text: string }).text.trim();
    if (trimmed && trimmed !== "[object Object]") {
      return trimmed;
    }
  }

  return null;
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
    const normalized = normalizeOptionValue(raw.options[i]);
    if (!normalized) {
      return { quiz: null, reason: `option[${i}] is invalid` };
    }
    options.push(normalized);
  }

  // Reject duplicate options (exact match after trim)
  const uniqueOptions = new Set(options);
  if (uniqueOptions.size !== options.length) {
    return { quiz: null, reason: "options contain duplicates" };
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

  const fileId =
    defaults?.fileId ??
    (typeof raw.fileId === "number" ? raw.fileId : undefined);

  const fileName =
    defaults?.fileName ??
    (typeof raw.fileName === "string" && raw.fileName.trim() !== ""
      ? raw.fileName.trim()
      : undefined);

  const explanation =
    typeof raw.explanation === "string" && raw.explanation.trim() !== ""
      ? raw.explanation.trim()
      : "解説なし";

  const categoryVal =
    typeof raw.category === "string" && raw.category.trim() !== ""
      ? raw.category.trim()
      : defaults?.category && defaults.category.trim() !== ""
        ? defaults.category.trim()
        : "一般";

  const difficultyVal =
    typeof raw.difficulty === "string" &&
    ["easy", "medium", "hard"].includes(raw.difficulty)
      ? (raw.difficulty as "easy" | "medium" | "hard")
      : defaults?.difficulty || "medium";

  const keyword =
    typeof raw.keyword === "string" ? raw.keyword.trim() : "";

  const id =
    typeof raw.id === "string" && raw.id.trim() !== ""
      ? raw.id.trim()
      : createQuizId();

  return {
    quiz: {
      id,
      fileId,
      fileName,
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
