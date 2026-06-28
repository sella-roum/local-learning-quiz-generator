import Dexie, { type Table } from "dexie";

// ファイル情報の型定義
export interface FileItem {
  id?: number;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  extractedText?: string;
  keywords: string[];
  summary?: string; // 概要を追加
  structure?: string; // 追加: ファイルの内容の構成
  uploadedAt: Date;
}

// クイズの型定義
export interface Quiz {
  id?: number;
  fileId?: number; // オプショナルに変更（ファイルが削除されても問題は残る）
  category: string; // カテゴリを追加
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string; // 解説を追加
  createdAt: Date;
  updatedAt: Date;
}

// 回答結果の型定義
export interface Result {
  id?: number;
  quizId: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
  answeredAt: Date;
  sessionId?: string;
}

// セッション情報の型定義
export interface Session {
  id?: string;
  startedAt: Date;
  endedAt?: Date;
  quizIds: number[];
  category?: string; // カテゴリを追加
  score?: number;
  totalQuestions?: number;
  results?: Result[]; // 追加: Session型に results プロパティを定義
}

/**
 * DB schema history
 *
 * v1 (initial):
 * - Initial local quiz database with basic stores
 *
 * v2 (current):
 * - files / quizzes / results / sessions stores
 * - quiz.category, session.category, session.totalQuestions are used by current UI
 *
 * Migration policy:
 * - Do not mutate existing user data without an explicit migration plan.
 * - Prefer adding safe optional fields over destructive schema changes.
 * - Repair of legacy invalid quiz data must be implemented as a separate task.
 * - When adding a new version, document what changed and why.
 */

// Dexieデータベースクラスの拡張
class QuizDatabase extends Dexie {
  files!: Table<FileItem, number>;
  quizzes!: Table<Quiz, number>;
  results!: Table<Result, number>;
  sessions!: Table<Session, string>;

  constructor() {
    super("QuizDatabase");
    this.version(2).stores({
      files: "++id, name, type, uploadedAt",
      quizzes: "++id, fileId, category, createdAt, updatedAt",
      results: "++id, quizId, isCorrect, answeredAt, sessionId",
      sessions: "id, startedAt, endedAt, category",
    });
  }
}

// データベースのインスタンスを作成
export const db = new QuizDatabase();

// データベースが利用可能かどうかを確認する関数
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.open();
    return true;
  } catch (error) {
    console.error("IndexedDBが利用できません:", error);
    return false;
  }
}

/**
 * Cleans up abandoned sessions.
 *
 * Conditions for removal (only no-result, never-started sessions):
 * - No results AND no endedAt (never started or abandoned before any answer)
 *
 * Sessions with totalQuestions mismatch are NOT removed to avoid orphan results.
 * Use getSessionIntegrity() to detect incomplete sessions and handle them
 * on the UI side (hide or warn) instead.
 *
 * Sessions that have endedAt set are never removed.
 */
export async function cleanupEmptySessions(): Promise<void> {
  const removeSession = async (session: Session): Promise<boolean> => {
    if (session.endedAt !== undefined) return false;
    const resultCount = await db.results
      .where("sessionId")
      .equals(session.id!)
      .count();
    return resultCount === 0;
  };

  if (process.env.NODE_ENV === "production") {
    try {
      const sessions = await db.sessions.toArray();
      for (const session of sessions) {
        if (await removeSession(session)) {
          await db.sessions.delete(session.id!);
        }
      }
    } catch {
      // Silent in production
    }
    return;
  }

  try {
    console.log("Cleaning up empty session records...");
    const sessions = await db.sessions.toArray();

    let removedCount = 0;
    for (const session of sessions) {
      if (await removeSession(session)) {
        await db.sessions.delete(session.id!);
        removedCount++;
      }
    }
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} empty session(s).`);
    }
  } catch (error) {
    console.error(
      "Failed to clean up empty session records:",
      error instanceof Error ? error.message : error
    );
  }
}
