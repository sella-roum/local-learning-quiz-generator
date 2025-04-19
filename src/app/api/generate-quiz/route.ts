import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  Part,
  GenerateContentConfig,
  Schema,
  Type,
} from "@google/genai";
import { v4 as uuidv4 } from "uuid";

// 環境変数からフロントエンドのURLを取得（Renderで設定したもの）
const allowedOrigin = process.env.FRONTEND_URL;

// CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse): NextResponse {
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  } else {
    // 開発環境など、FRONTEND_URLが設定されていない場合は '*' を許可（本番では非推奨）
    // もしくは、ローカル開発用のURL 'http://localhost:3000' を許可する
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.ACCESS_CONTROL_ALLOW_ORIGIN || "http://localhost:3000"
    );
  }
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS"); // このルートはPOSTのみ
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

// OPTIONSリクエストハンドラ (プリフライトリクエスト用)
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
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
      let errorResponse = NextResponse.json(
        { error: "キーワードが提供されていません" },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }
    if (!options || typeof options !== "object") {
      let errorResponse = NextResponse.json(
        { error: "生成オプションが提供されていません" },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }
    if (!fileContent || !fileType) {
      let errorResponse = NextResponse.json(
        { error: "ファイル内容またはファイルタイプが提供されていません" },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }

    // --- APIキー取得 ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      let errorResponse = NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
      return setCorsHeaders(errorResponse);
    }

    // --- @google/genai クライアント初期化 ---
    const ai = new GoogleGenAI({ apiKey });

    // --- モデルIDリスト ---
    const modelIdsToTry = [
      "gemini-2.5-flash-preview-04-17",
      "gemini-2.0-flash",
    ];
    const thinkingModelIds = ["gemini-2.5-flash-preview-04-17"];

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

    // --- API呼び出しとリトライ処理 ---
    let geminiResponse: GenerateContentResponse | null = null;
    let lastError: any = null;

    for (const modelId of modelIdsToTry) {
      console.log(`モデル ${modelId} でクイズ生成API呼び出しを試行します...`);
      try {
        const generationConfig: GenerateContentConfig = {
          responseMimeType: "application/json",
          responseSchema: quizListSchema,
        };
        if (thinkingModelIds.includes(modelId)) {
          generationConfig.thinkingConfig = { thinkingBudget: 24576 };
        }

        const currentResponse = await ai.models.generateContent({
          model: modelId,
          contents: requestContents,
          config: generationConfig,
        });

        const resultText = currentResponse.text;
        console.log(
          `モデル ${modelId} からのクイズ生成応答テキスト:`,
          resultText
        );

        if (resultText) {
          // 応答が配列形式か確認 (簡易チェック)
          try {
            const parsed = JSON.parse(resultText);
            if (Array.isArray(parsed)) {
              geminiResponse = currentResponse;
              console.log(`モデル ${modelId} で成功しました。`);
              break;
            } else {
              console.warn(
                `モデル ${modelId} の応答が配列形式ではありません。`
              );
              lastError = new Error(
                `モデル ${modelId} の応答が配列形式ではありません。`
              );
            }
          } catch (jsonError) {
            console.warn(`モデル ${modelId} の応答JSONパースに失敗しました。`);
            lastError = new Error(
              `モデル ${modelId} の応答JSONパースに失敗しました。`
            );
          }
        } else {
          console.warn(`モデル ${modelId} からの応答が空でした。`);
          if (currentResponse.promptFeedback?.blockReason) {
            console.error(
              `モデル ${modelId} でリクエストがブロックされました: ${currentResponse.promptFeedback.blockReason}`
            );
            geminiResponse = currentResponse; // ブロックされたレスポンスを保持
            break;
          }
          lastError = new Error(
            `モデル ${modelId} から有効なコンテンツが得られませんでした。`
          );
        }
      } catch (apiError) {
        lastError = apiError;
        console.error(
          `モデル ${modelId} でのクイズ生成API呼び出し中にエラーが発生しました:`,
          apiError
        );
      }
    }

    // --- 結果処理 ---
    if (!geminiResponse || !geminiResponse.text) {
      const blockReason = geminiResponse?.promptFeedback?.blockReason;
      const errorMsg = blockReason
        ? `リクエストがブロックされました: ${blockReason}`
        : "AIモデルとの通信に失敗しました。";
      const status = blockReason ? 400 : 502;
      console.error(errorMsg, lastError);

      let errorResponse = NextResponse.json(
        {
          error: errorMsg,
          details: lastError instanceof Error ? lastError.message : lastError,
        },
        { status }
      );
      return setCorsHeaders(errorResponse);
    }

    const resultText = geminiResponse.text;

    // --- JSONパースと検証 ---
    let generatedQuizzesRaw: any[];
    try {
      generatedQuizzesRaw = JSON.parse(resultText);
      if (!Array.isArray(generatedQuizzesRaw)) {
        throw new Error("AIからの応答が配列形式ではありません。");
      }
    } catch (parseError) {
      console.error("クイズ生成結果のJSONパースに失敗しました:", parseError);
      // console.log("Raw response:", resultText);
      let errorResponse = NextResponse.json(
        { error: "AIからの応答形式が不正です (JSONパース失敗)。" },
        { status: 500 }
      );
      return setCorsHeaders(errorResponse);
    }

    // --- 生成されたクイズの整形とID付与 ---
    const generatedQuizzes: GeneratedQuiz[] = generatedQuizzesRaw
      .map((q: any): GeneratedQuiz | null => {
        // 簡単なバリデーション
        if (
          !q ||
          typeof q !== "object" ||
          typeof q.question !== "string" ||
          !Array.isArray(q.options) ||
          q.options.length !== 4 ||
          typeof q.correctOptionIndex !== "number" ||
          q.correctOptionIndex < 0 ||
          q.correctOptionIndex > 3 ||
          typeof q.explanation !== "string" ||
          typeof q.category !== "string" ||
          !["easy", "medium", "hard"].includes(q.difficulty)
        ) {
          console.warn("不正な形式のクイズデータが含まれています:", q);
          return null; // 不正なデータはスキップ
        }
        return {
          id: uuidv4(), // 各クイズにユニークIDを付与
          question: q.question,
          options: q.options.map(String), // 文字列であることを保証
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          category: q.category || options.category || "一般", // カテゴリのフォールバック
          difficulty: q.difficulty,
          keyword: q.keyword, // オプショナルなキーワード
        };
      })
      .filter((q): q is GeneratedQuiz => q !== null); // nullを除外

    if (generatedQuizzes.length === 0 && generatedQuizzesRaw.length > 0) {
      console.error("有効なクイズデータが生成されませんでした。");
      let errorResponse = NextResponse.json(
        { error: "AIからの応答形式が不正です (有効データなし)。" },
        { status: 500 }
      );
      return setCorsHeaders(errorResponse);
    }

    let successResponse = NextResponse.json({ quizzes: generatedQuizzes });
    return setCorsHeaders(successResponse);
  } catch (error) {
    console.error("クイズ生成APIルートで予期せぬエラー:", error);
    let errorResponse = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "クイズ生成中に予期せぬエラーが発生しました",
      },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
