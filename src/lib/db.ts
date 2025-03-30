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
}

// Dexieデータベースクラスの拡張
class QuizDatabase extends Dexie {
  files!: Table<FileItem, number>;
  quizzes!: Table<Quiz, number>;
  results!: Table<Result, number>;
  sessions!: Table<Session, string>;

  constructor() {
    super("QuizDatabase");
    this.version(1).stores({
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

// 回答履歴のないセッションを削除する関数
export async function cleanupEmptySessions(): Promise<void> {
  try {
    console.log("🧹 空のセッションレコードのクリーンアップを開始します...");
    const sessions = await db.sessions.toArray();

    for (const session of sessions) {
      const resultCount = await db.results
        .where("sessionId")
        .equals(session.id!)
        .count();
      // **問題数と回答数が一致しないセッションも削除対象に追加**
      if (
        (resultCount === 0 && session.endedAt === undefined) ||
        (session.totalQuestions !== undefined &&
          resultCount !== session.totalQuestions &&
          session.endedAt === undefined)
      ) {
        console.log(
          `🗑️ セッションID: ${session.id} を削除します (回答履歴なし、または問題数と回答数不一致)`
        );
        await db.sessions.delete(session.id!);
      }
    }
    console.log("✅ 空のセッションレコードのクリーンアップが完了しました。");
  } catch (error) {
    console.error(
      "🚨 空のセッションレコードのクリーンアップ中にエラーが発生しました:",
      error
    );
  }
}
