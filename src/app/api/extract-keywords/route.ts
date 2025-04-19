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

// POSTリクエストハンドラ
export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType } = await request.json();

    // --- 入力チェック ---
    if (!fileContent) {
      let errorResponse = NextResponse.json(
        { error: "ファイル内容が提供されていません" },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }
    if (!fileType) {
      let errorResponse = NextResponse.json(
        { error: "ファイルタイプが指定されていません" },
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

    // --- responseSchema (キーワード配列用) ---
    const keywordsResponseSchema: Schema = {
      type: Type.ARRAY,
      description: "抽出された重要なキーワードの文字列配列。",
      items: { type: Type.STRING, description: "個々のキーワード文字列" },
    };

    // --- プロンプトとコンテンツパーツの準備 ---
    let prompt = "";
    const requestContents: Content[] = [];
    const parts: Part[] = [];

    if (fileType.startsWith("text/")) {
      prompt = `以下のテキストから重要なキーワードを10〜15個抽出し、JSON配列形式で返してください。\n\nテキスト:\n${fileContent}`;
      parts.push({ text: prompt });
    } else if (fileType === "application/pdf") {
      prompt = `このPDFから重要なキーワードを10〜15個抽出し、JSON配列形式で返してください。`;
      parts.push({ text: prompt });
      parts.push({ inlineData: { mimeType: fileType, data: fileContent } });
    } else if (fileType.startsWith("image/")) {
      prompt = `この画像から重要なキーワードを5〜10個抽出し、JSON配列形式で返してください。`;
      parts.push({ text: prompt });
      parts.push({ inlineData: { mimeType: fileType, data: fileContent } });
    } else {
      let errorResponse = NextResponse.json(
        { error: "サポートされていないファイルタイプです。" },
        { status: 400 }
      );
      return setCorsHeaders(errorResponse);
    }
    requestContents.push({ role: "user", parts });

    // --- API呼び出しとリトライ処理 ---
    let geminiResponse: GenerateContentResponse | null = null;
    let lastError: any = null;

    for (const modelId of modelIdsToTry) {
      console.log(`モデル ${modelId} でAPI呼び出しを試行します...`);
      try {
        const generationConfig: GenerateContentConfig = {
          responseMimeType: "application/json",
          responseSchema: keywordsResponseSchema,
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
        console.log(`モデル ${modelId} からの応答テキスト:`, resultText);

        if (resultText) {
          geminiResponse = currentResponse;
          console.log(`モデル ${modelId} で成功しました。`);
          break;
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
          `モデル ${modelId} でのAPI呼び出し中にエラーが発生しました:`,
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

    // --- JSONパースとフォールバック ---
    let keywords: string[] = [];
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(resultText);
        if (Array.isArray(parsedData)) {
          keywords = parsedData.filter(
            (item): item is string => typeof item === "string"
          );
        } else if (
          typeof parsedData === "object" &&
          parsedData !== null &&
          Array.isArray(parsedData.keywords)
        ) {
          // { "keywords": [...] } 形式のレスポンスにも対応
          keywords = parsedData.keywords.filter(
            (item: unknown): item is string => typeof item === "string"
          );
        }
      } catch (initialParseError) {
        console.warn(
          "直接のJSONパース失敗、フォールバック試行:",
          initialParseError
        );
        const jsonBlockMatch = resultText.match(/```json\s*(\[.*?\])\s*```/s);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          try {
            // キャプチャグループの文字列 jsonBlockMatch[1] をパースする
            parsedData = JSON.parse(jsonBlockMatch[1]);
            if (Array.isArray(parsedData)) {
              keywords = parsedData.filter(
                (item): item is string => typeof item === "string"
              );
            }
          } catch (blockParseError) {
            console.warn("```json ブロックのパース失敗:", blockParseError);
          }
        }
        // 必要であれば更なるフォールバックを追加 (例: 行ごとの抽出)
        if (keywords.length === 0) {
          keywords = resultText
            .split("\n")
            .map((line) => line.trim().replace(/^["'\s*-]+|["'\s*-]+$/g, ""))
            .filter(Boolean);
        }
      }

      if (keywords.length === 0) {
        console.error("キーワードの抽出に失敗しました。");
        // 空でも成功として返すか、エラーにするかは要件次第
        let successResponse = NextResponse.json({ keywords: [] });
        return setCorsHeaders(successResponse);
      }

      let successResponse = NextResponse.json({ keywords });
      return setCorsHeaders(successResponse);
    } catch (error) {
      console.error("キーワード抽出結果の解析中に予期せぬエラー:", error);
      // console.log("生の結果:", resultText);
      // 解析エラーの場合もフォールバックとして行分割などを試みる
      keywords = resultText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 15);
      let response = NextResponse.json({ keywords });
      return setCorsHeaders(response);
    }
  } catch (error) {
    console.error("キーワード抽出APIルートで予期せぬエラー:", error);
    let errorResponse = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "キーワード抽出中に予期せぬエラーが発生しました",
      },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
