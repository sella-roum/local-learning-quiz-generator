import Dexie, { type Table } from "dexie";

// ファイル情報の型���義
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
