export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface GenerateQuiz {
  id: string;
  fileId: number | undefined;
  fileName: string | undefined;
  question: string;
  correctOptionIndex: number;
  options: QuizOption[];
  explanation: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  keyword: string;
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
    const formData = new FormData();
    formData.append("file", file);

    // ファイルタイプに応じてリクエストボディを作成
    let requestBody: ExtractKeywordsRequestBody = {
      fileContent: "",
      fileType: file.type,
    };

    if (file.type.startsWith("text/") || file.type === "application/pdf") {
      // テキストまたはPDFの場合
      requestBody = {
        fileContent: typeof fileContent === "string" ? fileContent : "",
        fileType: file.type,
      };
    } else if (file.type.startsWith("image/")) {
      // 画像の場合はBase64エンコード
      const base64 = await arrayBufferToBase64(fileContent as ArrayBuffer);
      requestBody = {
        fileContent: base64,
        fileType: file.type,
      };
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
    throw error;
  }
}

// クイズを生成するAPI呼び出し
export async function generateQuizzes(
  file: File,
  fileContent: string | ArrayBuffer,
  keywords: string[],
  summary: string,
  structure: string,
  options?: GenerateQuizOptions
): Promise<GenerateQuiz[]> {
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

    if (file.type.startsWith("text/") || file.type === "application/pdf") {
      // テキストまたはPDFの場合
      requestBody.fileContent =
        typeof fileContent === "string" ? fileContent : "";
      requestBody.fileType = file.type;
    } else if (file.type.startsWith("image/")) {
      // 画像の場合はBase64エンコード
      const base64 = await arrayBufferToBase64(fileContent as ArrayBuffer);
      requestBody.fileContent = base64;
      requestBody.fileType = file.type;
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
    return data.quizzes;
  } catch (error) {
    console.error("クイズ生成中にエラーが発生しました:", error);
    throw error;
  }
}

// ArrayBufferをBase64に変換する関数
function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // data:image/jpeg;base64, の部分を削除
      const base64 = base64String.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
