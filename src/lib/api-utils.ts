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
      try {
        // PDFまたは画像ファイルの場合はBase64エンコード
        const base64 = await arrayBufferToBase64(
          typeof fileContent === "string"
            ? // TextEncoder().encode().buffer の結果を ArrayBuffer として型アサーション
              (new TextEncoder().encode(fileContent).buffer as ArrayBuffer)
            : (fileContent as ArrayBuffer)
        );
        requestBody = {
          fileContent: base64,
          fileType: file.type,
        };
      } catch (encodeError) {
        console.error(
          "ファイルのエンコード中にエラーが発生しました:",
          encodeError
        );
        // エンコードに失敗した場合は空の内容で続行
        requestBody = {
          fileContent: "",
          fileType: file.type,
        };
      }
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
    // エラーが発生した場合でも最低限の情報を返す
    return {
      keywords: ["エラー", "抽出失敗"],
      summary: "コンテンツの解析中にエラーが発生しました。",
      structure: "",
    };
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

    // PDFファイルの場合、ファイルの内容を直接取得
    if (file.type === "application/pdf") {
      try {
        // PDFファイルをArrayBufferとして読み込み直す
        const arrayBuffer = await file.arrayBuffer();
        const base64 = await arrayBufferToBase64(arrayBuffer);

        if (!base64) {
          throw new Error("PDFファイルのエンコードに失敗しました");
        }

        requestBody.fileContent = base64;
        requestBody.fileType = file.type;
      } catch (error) {
        console.error("PDFファイルの処理中にエラーが発生しました:", error);

        // PDFのテキスト抽出内容があればそれを使用
        if (typeof fileContent === "string" && fileContent.trim() !== "") {
          requestBody.fileContent = fileContent;
          requestBody.fileType = "text/plain";
        } else {
          throw new Error("PDFファイルの内容を取得できませんでした");
        }
      }
    } else if (file.type.startsWith("text/")) {
      // テキストファイルの場合
      if (typeof fileContent !== "string" || fileContent.trim() === "") {
        throw new Error("テキストファイルの内容が空です");
      }
      requestBody.fileContent = fileContent as string;
      requestBody.fileType = file.type;
    } else if (file.type.startsWith("image/")) {
      // 画像ファイルの場合
      try {
        // 画像ファイルをArrayBufferとして読み込み直す
        const arrayBuffer = await file.arrayBuffer();
        const base64 = await arrayBufferToBase64(arrayBuffer);

        if (!base64) {
          throw new Error("画像ファイルのエンコードに失敗しました");
        }

        requestBody.fileContent = base64;
        requestBody.fileType = file.type;
      } catch (error) {
        console.error("画像ファイルの処理中にエラーが発生しました:", error);
        throw new Error("画像ファイルの内容を取得できませんでした");
      }
    }

    // fileContentが空でないことを確認
    if (!requestBody.fileContent) {
      throw new Error("ファイル内容が空です");
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
