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

    // --- responseSchema ---
    const analysisResponseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        keywords: {
          type: Type.ARRAY,
          description: "キーワードリスト",
          items: { type: Type.STRING },
        },
        summary: { type: Type.STRING, description: "概要" },
        structure: { type: Type.STRING, description: "構成" },
      },
      required: ["keywords", "summary", "structure"],
    };

    // --- プロンプトとコンテンツパーツの準備 ---
    let prompt = "";
    const requestContents: Content[] = [];
    const parts: Part[] = [];

    if (fileType.startsWith("text/")) {
      prompt = `以下のテキストを分析して、重要なキーワード(10-15個)、概要(100-200字)、構成(200字以上)を抽出し、指定のJSON形式で返してください。\n\nテキスト:\n${fileContent}`;
      parts.push({ text: prompt });
    } else if (fileType === "application/pdf") {
      prompt = `このPDFを分析して、重要なキーワード(10-15個)、概要(100-200字)、構成(200字以上)を抽出し、指定のJSON形式で返してください。`;
      parts.push({ text: prompt });
      parts.push({ inlineData: { mimeType: fileType, data: fileContent } });
    } else if (fileType.startsWith("image/")) {
      prompt = `この画像を分析して、重要なキーワード(5-10個)、概要(100字程度)、構成(100字以上)を抽出し、指定のJSON形式で返してください。`;
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
          responseSchema: analysisResponseSchema,
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
        // console.log(`モデル ${modelId} からの応答テキスト:`, resultText);

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
    let data;
    try {
      data = JSON.parse(resultText);
    } catch (parseError) {
      console.warn("JSONパース失敗、フォールバック試行:", parseError);
      const jsonBlockMatch = resultText.match(/```json\s*(\{.*?\})\s*```/s);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        try {
          data = JSON.parse(jsonBlockMatch[1]);
        } catch (blockParseError) {
          console.error("```json ブロックのパース失敗:", blockParseError);
        }
      }
      // 必要であれば更なるフォールバックを追加
    }

    if (data && typeof data === "object") {
      let successResponse = NextResponse.json({
        keywords: data.keywords || [],
        summary: data.summary || "",
        structure: data.structure || "",
      });
      return setCorsHeaders(successResponse);
    } else {
      console.error("JSON形式での応答が見つからないか、パースに失敗しました。");
      // ここでさらにテキストから情報を抽出するフォールバックロジックを実装することも可能
      let errorResponse = NextResponse.json(
        {
          error: "AIからの応答形式が不正です。",
          keywords: [],
          summary: "情報の抽出に失敗しました。",
          structure: "",
        },
        { status: 500 }
      );
      return setCorsHeaders(errorResponse);
    }
  } catch (error) {
    console.error("APIルートで予期せぬエラーが発生しました:", error);
    let errorResponse = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "サーバー内部で予期せぬエラーが発生しました",
      },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
