import type { Quiz } from "@/lib/db";
import { type GenerateQuizNormalized } from "@/lib/quiz-normalizer";
import { checkQuizQuality } from "@/lib/quiz-quality";

export interface PrepareQuizzesForSaveResult {
  /** Quizzes ready for DB insertion (omitting auto-generated id). */
  quizzes: Omit<Quiz, "id">[];
  /** Number of quizzes that failed normalization. */
  rejectedCount: number;
  /** Number of quizzes with at least one quality error. */
  qualityErrorCount: number;
  /** Number of quizzes with at least one quality warning (no errors). */
  qualityWarningCount: number;
}

/**
 * Prepares an array of normalized quizzes for DB storage.
 *
 * Steps:
 * 1. Converts GenerateQuizNormalized to DB-compatible shape (Omit<Quiz, "id">).
 * 2. Runs quality checks and counts errors/warnings.
 * 3. Does NOT insert into DB — callers should use db.quizzes.bulkAdd().
 *
 * @param inputs - Array of already-normalized quizzes.
 * @param defaults - Optional default values for category/difficulty.
 */
export function prepareQuizzesForSave(
  inputs: GenerateQuizNormalized[],
): PrepareQuizzesForSaveResult {
  const quizzes: Omit<Quiz, "id">[] = [];
  let qualityErrorCount = 0;
  let qualityWarningCount = 0;

  for (const quiz of inputs) {
    const quality = checkQuizQuality(quiz);

    if (quality.hasErrors) {
      qualityErrorCount++;
      continue;
    }

    if (quality.hasWarnings) {
      qualityWarningCount++;
    }

    quizzes.push({
      fileId: quiz.fileId,
      category: quiz.category || "",
      question: quiz.question,
      options: quiz.options,
      correctOptionIndex: quiz.correctOptionIndex,
      explanation: quiz.explanation || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    quizzes,
    rejectedCount: 0, // Normalization already done; this is for API compatibility
    qualityErrorCount,
    qualityWarningCount,
  };
}
