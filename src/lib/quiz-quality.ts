import type { GenerateQuizNormalized } from "@/lib/quiz-normalizer";

export type QuizQualitySeverity = "error" | "warning";

export interface QuizQualityIssue {
  severity: QuizQualitySeverity;
  code:
    | "EMPTY_QUESTION"
    | "EMPTY_OPTION"
    | "DUPLICATE_OPTIONS"
    | "INVALID_CORRECT_INDEX"
    | "MISSING_EXPLANATION"
    | "SHORT_QUESTION"
    | "SHORT_OPTION";
  message: string;
}

export interface QuizQualityReport {
  issues: QuizQualityIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

/**
 * Checks a single quiz for quality issues.
 *
 * Error-level issues prevent saving:
 * - Empty question
 * - Not exactly 4 options
 * - Empty option
 * - Duplicate options
 * - Invalid correctOptionIndex
 *
 * Warning-level issues allow saving but are reported:
 * - Missing explanation (empty or "解説なし")
 * - Question too short (< 8 characters)
 * - Option too short, but not empty
 */
export function checkQuizQuality(
  quiz: GenerateQuizNormalized
): QuizQualityReport {
  const issues: QuizQualityIssue[] = [];

  // --- Error checks ---

  if (!quiz.question.trim()) {
    issues.push({
      severity: "error",
      code: "EMPTY_QUESTION",
      message: "問題文が空です",
    });
  }

  if (quiz.options.length !== 4) {
    issues.push({
      severity: "error",
      code: "EMPTY_OPTION",
      message: "選択肢は4つ必要です",
    });
  }

  for (let i = 0; i < quiz.options.length; i++) {
    if (!quiz.options[i].trim()) {
      issues.push({
        severity: "error",
        code: "EMPTY_OPTION",
        message: `選択肢${i + 1}が空です`,
      });
    }
  }

  const uniqueOptions = new Set(quiz.options.map((o) => o.trim()));
  if (uniqueOptions.size !== quiz.options.length) {
    issues.push({
      severity: "error",
      code: "DUPLICATE_OPTIONS",
      message: "選択肢に重複があります",
    });
  }

  if (
    !Number.isInteger(quiz.correctOptionIndex) ||
    quiz.correctOptionIndex < 0 ||
    quiz.correctOptionIndex > 3
  ) {
    issues.push({
      severity: "error",
      code: "INVALID_CORRECT_INDEX",
      message: "正解の選択肢インデックスが不正です",
    });
  }

  // --- Warning checks ---

  if (
    !quiz.explanation.trim() ||
    quiz.explanation.trim() === "解説なし"
  ) {
    issues.push({
      severity: "warning",
      code: "MISSING_EXPLANATION",
      message: "解説が設定されていません",
    });
  }

  if (quiz.question.trim().length < 8) {
    issues.push({
      severity: "warning",
      code: "SHORT_QUESTION",
      message: "問題文が短すぎます",
    });
  }

  for (let i = 0; i < quiz.options.length; i++) {
    const len = quiz.options[i].trim().length;
    if (len > 0 && len < 2) {
      issues.push({
        severity: "warning",
        code: "SHORT_OPTION",
        message: `選択肢${i + 1}が短すぎます`,
      });
    }
  }

  return {
    issues,
    hasErrors: issues.some((issue) => issue.severity === "error"),
    hasWarnings: issues.some((issue) => issue.severity === "warning"),
  };
}

/**
 * Summarises quality check results for an array of quizzes.
 *
 * Returns:
 * - errorCount: number of quizzes with at least one error
 * - warningCount: number of quizzes with at least one warning (but no errors)
 * - quizIssueCounts: map of quiz index -> total issue count
 */
export function summarizeQuizQuality(
  quizzes: GenerateQuizNormalized[]
): {
  errorCount: number;
  warningCount: number;
  quizIssueCounts: Record<number, number>;
} {
  let errorCount = 0;
  let warningCount = 0;
  const quizIssueCounts: Record<number, number> = {};

  quizzes.forEach((quiz, index) => {
    const report = checkQuizQuality(quiz);
    const issueCount = report.issues.length;
    if (issueCount > 0) {
      quizIssueCounts[index] = issueCount;
    }
    if (report.hasErrors) {
      errorCount++;
    } else if (report.hasWarnings) {
      warningCount++;
    }
  });

  return { errorCount, warningCount, quizIssueCounts };
}
