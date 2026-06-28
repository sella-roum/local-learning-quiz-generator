import {
  normalizeGeneratedQuizzes,
  type GenerateQuizNormalized,
} from "@/lib/quiz-normalizer";
import { validatePayloadSize } from "@/lib/limits";

export type GenerateQuiz = GenerateQuizNormalized;

export interface GenerateQuizzesResult {
  quizzes: GenerateQuiz[];
  rejectedCount: number;
}

interface GenerateQuizOptions {
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
  prompt?: string;
}

interface GenerateQuizRequestBody {
  keywords: string[];
  options: {
    count: number;
    difficulty: "easy" | "medium" | "hard";
    category: string;
    prompt: string;
  };
  fileContent?: string;
  fileType?: string;
  summary?: string;
  structure?: string;
}

interface ExtractKeywordsRequestBody {
  fileContent: string;
  fileType: string;
}

export async function extractKeywordsAndSummary(
  file: File,
  fileContent: string | ArrayBuffer
): Promise<{ keywords: string[]; summary: string; structure: string }> {
  try {
    // ファイルタイプに応じてリクエストボディを作成
    let requestBody: ExtractKeywordsRequestBody = {
      fileContent: "",
      fileType: file.type,
    };

    if (file.type.startsWith("text/")) {
      // テキストファイルの場合
      requestBody = {
        fileContent: typeof fileContent === "string" ? fileContent : "",
        fileType: file.type,
      };
    } else if (
      file.type === "application/pdf" ||
      file.type.startsWith("image/")
    ) {
      const base64 = await arrayBufferToBase64(
        typeof fileContent === "string"
          ? (new TextEncoder().encode(fileContent).buffer as ArrayBuffer)
          : (fileContent as ArrayBuffer)
      );

      if (!base64) {
        throw new Error(
          file.type === "application/pdf"
            ? "PDFファイルの内容が空です"
            : "画像ファイルの内容が空です"
        );
      }

      requestBody = {
        fileContent: base64,
        fileType: file.type,
      };
    }

    // ペイロードサイズ検証 (fetch前に実施)
    const payloadError = validatePayloadSize(
      requestBody.fileType,
      requestBody.fileContent
    );

    if (payloadError) {
      throw new Error(payloadError);
    }

    // APIを呼び出す
    const response = await fetch("/api/extract-keywords-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "キーワードと概要の抽出に失敗しました"
      );
    }

    const data = await response.json();
    return {
      keywords: data.keywords || [],
      summary: data.summary || "",
      structure: data.structure || "",
    };
  } catch (error) {
    console.error("キーワードと概要の抽出中にエラーが発生しました:", error);

    if (shouldRethrowInputError(error)) {
      throw error;
    }

    // エラーが発生した場合でも最低限の情報を返す
    return {
      keywords: ["エラー", "抽出失敗"],
      summary: "コンテンツの解析中にエラーが発生しました。",
      structure: "",
    };
  }
}

function shouldRethrowInputError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("長すぎます") ||
    error.message.includes("大きすぎます") ||
    error.message.includes("内容が空です") ||
    error.message.includes("413")
  );
}

// クイズを生成するAPI呼び出し
export async function generateQuizzes(
  file: File,
  fileContent: string | ArrayBuffer,
  keywords: string[],
  summary: string,
  structure: string,
  options?: GenerateQuizOptions
): Promise<GenerateQuizzesResult> {
  try {
    // ファイルタイプに応じてリクエストボディを作成
    const requestBody: GenerateQuizRequestBody = {
      keywords,
      summary,
      structure,
      options: {
        count: options?.count || 5,
        difficulty: options?.difficulty || "medium",
        category: options?.category || "一般",
        prompt: options?.prompt || "",
      },
    };

    // PDFファイルの場合、ファイルの内容を直接取得
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = await arrayBufferToBase64(arrayBuffer);

      if (!base64) {
        throw new Error("PDFファイルのエンコードに失敗しました");
      }

      requestBody.fileContent = base64;
      requestBody.fileType = file.type;
    } else if (file.type.startsWith("text/")) {
      // テキストファイルの場合
      if (typeof fileContent !== "string" || fileContent.trim() === "") {
        throw new Error("テキストファイルの内容が空です");
      }
      requestBody.fileContent = fileContent as string;
      requestBody.fileType = file.type;
    } else if (file.type.startsWith("image/")) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = await arrayBufferToBase64(arrayBuffer);

      if (!base64) {
        throw new Error("画像ファイルのエンコードに失敗しました");
      }

      requestBody.fileContent = base64;
      requestBody.fileType = file.type;
    }

    // ファイル内容とタイプの存在検証
    if (!requestBody.fileContent || !requestBody.fileType) {
      throw new Error("ファイル内容またはファイルタイプが提供されていません");
    }

    // ペイロードサイズ検証
    const payloadError = validatePayloadSize(
      requestBody.fileType,
      requestBody.fileContent
    );

    if (payloadError) {
      throw new Error(payloadError);
    }

    // APIを呼び出す
    const response = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "クイズ生成に失敗しました");
    }

    const data = await response.json();
    const rawQuizzes = Array.isArray(data.quizzes) ? data.quizzes : [];
    const { quizzes, rejectedCount } = normalizeGeneratedQuizzes(rawQuizzes, {
      category: options?.category || "一般",
      difficulty: options?.difficulty || "medium",
    });
    if (quizzes.length === 0) {
      throw new Error(
        "保存可能なクイズが生成されませんでした。条件を変えて再生成してください。"
      );
    }
    return { quizzes, rejectedCount };
  } catch (error) {
    console.error("クイズ生成中にエラーが発生しました:", error);
    throw error;
  }
}

// ArrayBufferをBase64に変換する関数
function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64String = reader.result as string;
          // data:image/jpeg;base64, の部分を削除
          const base64 = base64String.split(",")[1];
          resolve(base64);
        } catch (parseError) {
          reject(parseError);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
}
