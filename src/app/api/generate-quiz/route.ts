import { type NextRequest, NextResponse } from "next/server";
import {
  Content,
  Part,
  Schema,
  Type,
} from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { serverErrorLog } from "@/lib/server/safe-logger";
import { validatePayloadSize } from "@/lib/limits";
import {
  generateGeminiJson,
  GeminiApiError,
  toGeminiErrorResponse,
} from "@/lib/server/gemini";
import { createOptionsResponse, jsonWithCors } from "@/lib/server/cors";

const corsMethods = ["POST"] as const;

export async function OPTIONS() {
  return createOptionsResponse([...corsMethods]);
}

// クイズの型定義 (APIレスポンス用)
interface GeneratedQuiz {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  keyword?: string; // 関連キーワード (オプショナル)
}

// POSTリクエストハンドラ
export async function POST(request: NextRequest) {
  try {
    const { keywords, options, fileContent, fileType, summary, structure } =
      await request.json();

    // --- 入力チェック ---
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return jsonWithCors(
        { error: "キーワードが提供されていません" },
        { status: 400 },
        [...corsMethods]
      );
    }
    const generationOptions = options as Record<string, unknown>;
    if (
      !options ||
      typeof options !== "object" ||
      Array.isArray(options) ||
      !Number.isInteger(generationOptions.count) ||
      (generationOptions.count as number) <= 0
    ) {
      return jsonWithCors(
        { error: "生成オプションが提供されていません" },
        { status: 400 },
        [...corsMethods]
      );
    }
    if (!fileContent || !fileType) {
      return jsonWithCors(
        { error: "ファイル内容またはファイルタイプが提供されていません" },
        { status: 400 },
        [...corsMethods]
      );
    }
    if (typeof fileType !== "string" || typeof fileContent !== "string") {
      return jsonWithCors(
        { error: "不正なリクエスト形式です" },
        { status: 400 },
        [...corsMethods]
      );
    }

    // ペイロードサイズ検証
    const payloadError = validatePayloadSize(fileType, fileContent);
    if (payloadError) {
      return jsonWithCors(
        { error: payloadError },
        { status: 413 },
        [...corsMethods]
      );
    }

    // --- responseSchema (クイズ配列用) ---
    const quizSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: "問題文" },
        options: {
          type: Type.ARRAY,
          description: "選択肢(文字列4つ)",
          items: { type: Type.STRING },
        },
        correctOptionIndex: {
          type: Type.NUMBER,
          description: "正解の選択肢のインデックス(0-3)",
        },
        explanation: { type: Type.STRING, description: "解説文" },
        category: { type: Type.STRING, description: "カテゴリ" },
        difficulty: {
          type: Type.STRING,
          description: "難易度 (easy/medium/hard)",
        },
        keyword: {
          type: Type.STRING,
          description: "関連キーワード (オプショナル)",
        },
      },
      required: [
        "question",
        "options",
        "correctOptionIndex",
        "explanation",
        "category",
        "difficulty",
      ],
    };
    const quizListSchema: Schema = {
      type: Type.ARRAY,
      description: `生成された${options.count}個のクイズの配列`,
      items: quizSchema,
    };

    // --- プロンプトとコンテンツパーツの準備 ---
    let prompt = `
      以下の情報に基づいて、指定された条件で4択クイズを${
        options.count
      }個生成してください。
      各クイズは問題文、4つの選択肢、正解の選択肢のインデックス(0から始まる)、解説文、カテゴリ、難易度を含む必要があります。
      生成されるクイズは、提供されたキーワード、概要、構成、およびファイル内容全体を考慮してください。

      # 提供情報
      - キーワード: ${keywords.join(", ")}
      - 概要: ${summary || "なし"}
      - 構成: ${structure || "なし"}
      - ファイルタイプ: ${fileType}

      # 生成条件
      - 問題数: ${options.count}
      - 難易度: ${options.difficulty}
      - カテゴリ: ${options.category || "指定なし"}
      ${options.prompt ? `- カスタム指示: ${options.prompt}` : ""}

      # 出力形式
      以下のJSONスキーマに厳密に従ったJSON配列形式で返してください:
      ${JSON.stringify(quizListSchema, null, 2)}

      # ファイル内容
      ${
        fileType.startsWith("text/")
          ? fileContent
          : "(画像またはPDFの内容は以下に含まれます)"
      }
    `;

    const requestContents: Content[] = [];
    const parts: Part[] = [{ text: prompt }];

    if (fileType === "application/pdf" || fileType.startsWith("image/")) {
      parts.push({ inlineData: { mimeType: fileType, data: fileContent } });
    }
    requestContents.push({ role: "user", parts });

    // --- API呼び出し (共通化) ---
    const { data } = await generateGeminiJson<unknown[]>({
      route: "generate-quiz",
      contents: requestContents,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizListSchema,
      },
      requireJsonArray: true,
    });

    const generatedQuizzesRaw = data;

    // --- 生成されたクイズの整形とID付与 ---
    const generatedQuizzes: GeneratedQuiz[] = generatedQuizzesRaw
      .map((q: unknown): GeneratedQuiz | null => {
        const quiz = q as Record<string, unknown>;
        if (
          !quiz ||
          typeof quiz !== "object" ||
          typeof quiz.question !== "string" ||
          !Array.isArray(quiz.options) ||
          quiz.options.length !== 4 ||
          !(quiz.options as unknown[]).every((option) => typeof option === "string") ||
          typeof quiz.correctOptionIndex !== "number" ||
          !Number.isInteger(quiz.correctOptionIndex) ||
          quiz.correctOptionIndex < 0 ||
          quiz.correctOptionIndex > 3 ||
          typeof quiz.explanation !== "string" ||
          typeof quiz.category !== "string" ||
          !["easy", "medium", "hard"].includes(quiz.difficulty as string)
        ) {
          return null;
        }
        return {
          id: uuidv4(),
          question: quiz.question as string,
          options: quiz.options as string[],
          correctOptionIndex: quiz.correctOptionIndex as number,
          explanation: quiz.explanation as string,
          category: (quiz.category as string) || options.category || "一般",
          difficulty: quiz.difficulty as "easy" | "medium" | "hard",
          keyword: typeof quiz.keyword === "string" ? quiz.keyword : undefined,
        };
      })
      .filter((q): q is GeneratedQuiz => q !== null);

    if (generatedQuizzes.length === 0) {
      return jsonWithCors(
        { error: "AIからの応答形式が不正です (有効データなし)。" },
        { status: 500 },
        [...corsMethods]
      );
    }

    return jsonWithCors(
      { quizzes: generatedQuizzes },
      { status: 200 },
      [...corsMethods]
    );
  } catch (error) {
    if (error instanceof GeminiApiError) {
      const { body, status } = toGeminiErrorResponse(error);
      return jsonWithCors(body, { status }, [...corsMethods]);
    }

    serverErrorLog("クイズ生成APIルートで予期せぬエラー", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      route: "generate-quiz",
    });
    return jsonWithCors(
      {
        error:
          error instanceof Error
            ? error.message
            : "クイズ生成中に予期せぬエラーが発生しました",
      },
      { status: 500 },
      [...corsMethods]
    );
  }
}
