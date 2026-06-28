/**
 * Distributes `totalCount` items across `fileCount` buckets as evenly as possible.
 *
 * Examples:
 *   distributeQuizCount(10, 3) => [4, 3, 3]
 *   distributeQuizCount(3, 5)  => [1, 1, 1, 0, 0]
 *
 * Returns an empty array for invalid inputs.
 */
export function distributeQuizCount(
  totalCount: number,
  fileCount: number
): number[] {
  if (
    !Number.isInteger(totalCount) ||
    totalCount <= 0 ||
    !Number.isInteger(fileCount) ||
    fileCount <= 0
  ) {
    return [];
  }

  const base = Math.floor(totalCount / fileCount);
  const remainder = totalCount % fileCount;

  return Array.from({ length: fileCount }, (_, index) =>
    base + (index < remainder ? 1 : 0)
  );
}

/**
 * Trims an array to at most `count` items.
 * Returns an empty array for invalid count values.
 */
export function trimQuizzesToCount<T>(quizzes: T[], count: number): T[] {
  if (!Number.isInteger(count) || count <= 0) {
    return [];
  }

  return quizzes.slice(0, count);
}
