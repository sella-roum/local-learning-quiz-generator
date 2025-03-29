import type { Quiz } from "@/lib/db";

// エクスポート用のクイズ型定義
export interface ExportedQuiz {
  category: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

// エクスポートファイルの型定義
export interface QuizExportFile {
  version: string;
  exportedAt: string;
  quizzes: ExportedQuiz[];
}

// 現在のエクスポートバージョン
export const EXPORT_VERSION = "1.0";

// クイズをエクスポート用の形式に変換する関数
export function convertQuizToExportFormat(quiz: Quiz): ExportedQuiz {
  return {
    category: quiz.category || "一般",
    question: quiz.question,
    options: [...quiz.options],
    correctOptionIndex: quiz.correctOptionIndex,
    explanation: quiz.explanation,
  };
}

// エクスポート用のJSONを生成する関数
export function generateExportJson(quizzes: Quiz[]): string {
  const exportData: QuizExportFile = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    quizzes: quizzes.map(convertQuizToExportFormat),
  };

  return JSON.stringify(exportData, null, 2);
}

// JSONファイルをダウンロードする関数
export function downloadJson(jsonString: string, filename: string): void {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// インポートされたJSONを検証する関数
export function validateImportedJson(jsonString: string): {
  valid: boolean;
  data?: QuizExportFile;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    // バージョンチェック
    if (!data.version || data.version !== EXPORT_VERSION) {
      return {
        valid: false,
        error: `サポートされていないバージョンです: ${data.version || "不明"}`,
      };
    }

    // 必須フィールドのチェック
    if (!data.quizzes || !Array.isArray(data.quizzes)) {
      return {
        valid: false,
        error: "クイズデータが見つかりません",
      };
    }

    // 各クイズのフォーマットチェック
    for (let i = 0; i < data.quizzes.length; i++) {
      const quiz = data.quizzes[i];

      if (!quiz.question || typeof quiz.question !== "string") {
        return {
          valid: false,
          error: `クイズ #${i + 1}: 問題文が不正です`,
        };
      }

      if (
        !quiz.options ||
        !Array.isArray(quiz.options) ||
        quiz.options.length !== 4
      ) {
        return {
          valid: false,
          error: `クイズ #${i + 1}: 選択肢は4つ必要です`,
        };
      }

      if (
        quiz.correctOptionIndex === undefined ||
        typeof quiz.correctOptionIndex !== "number" ||
        quiz.correctOptionIndex < 0 ||
        quiz.correctOptionIndex >= quiz.options.length
      ) {
        return {
          valid: false,
          error: `クイズ #${i + 1}: 正解の選択肢が不正です`,
        };
      }
    }

    return {
      valid: true,
      data: data as QuizExportFile,
    };
  } catch (error) {
    return {
      valid: false,
      error:
        "JSONの解析に失敗しました: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }
}

// インポートされたクイズをデータベース用の形式に変換する関数
export function convertImportedQuizToDbFormat(
  importedQuiz: ExportedQuiz
): Omit<Quiz, "id"> {
  return {
    category: importedQuiz.category || "一般",
    question: importedQuiz.question,
    options: [...importedQuiz.options],
    correctOptionIndex: importedQuiz.correctOptionIndex,
    explanation: importedQuiz.explanation,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
