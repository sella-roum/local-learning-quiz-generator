import { db, type Session } from "@/lib/db";

export interface SessionIntegrity {
  /** Number of actual result records for this session. */
  resultCount: number;
  /** Expected number of questions from session.totalQuestions (null if not set). */
  expectedCount: number | null;
  /** Whether the session has an endedAt timestamp. */
  isCompleted: boolean;
  /** Whether the result count differs from the expected question count. */
  isIncomplete: boolean;
}

/**
 * Checks the integrity of a session by comparing actual result records
 * against the expected total question count.
 *
 * Use cases:
 * - History page: hide or mark incomplete sessions
 * - Results page: warn if results count != expected
 * - Stats calculation: skip incomplete sessions
 */
export async function getSessionIntegrity(
  session: Session
): Promise<SessionIntegrity> {
  if (!session.id) {
    return {
      resultCount: 0,
      expectedCount: session.totalQuestions ?? null,
      isCompleted: false,
      isIncomplete: true,
    };
  }

  const resultCount = await db.results
    .where("sessionId")
    .equals(session.id)
    .count();

  const expectedCount = session.totalQuestions ?? null;
  const isCompleted = Boolean(session.endedAt);
  const isIncomplete =
    expectedCount !== null && resultCount !== expectedCount;

  return { resultCount, expectedCount, isCompleted, isIncomplete };
}
