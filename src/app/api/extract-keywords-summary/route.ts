import { type NextRequest, NextResponse } from "next/server";
import {
  Content,
  Part,
  Schema,
  Type,
} from "@google/genai";
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

// POSTリクエストハンドラ
export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType } = await request.json();

    // --- 入力チェック ---
    if (!fileContent) {
      return jsonWithCors(
        { error: "ファイル内容が提供されていません" },
        { status: 400 },
        [...corsMethods]
      );
    }
    if (!fileType) {
      return jsonWithCors(
        { error: "ファイルタイプが指定されていません" },
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
      return jsonWithCors(
        { error: "サポートされていないファイルタイプです。" },
        { status: 400 },
        [...corsMethods]
      );
    }
    requestContents.push({ role: "user", parts });

    // --- API呼び出し (共通化) ---
    const { data } = await generateGeminiJson<{
      keywords?: unknown;
      summary?: unknown;
      structure?: unknown;
    }>({
      route: "extract-keywords-summary",
      contents: requestContents,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
      },
      requireJsonObject: true,
    });

    const result = data as Record<string, unknown>;

    if (
      !Array.isArray(result.keywords) ||
      !result.keywords.every((keyword) => typeof keyword === "string") ||
      typeof result.summary !== "string" ||
      typeof result.structure !== "string"
    ) {
      return jsonWithCors(
        { error: "AIからの応答形式が不正です。" },
        { status: 500 },
        [...corsMethods]
      );
    }

    return jsonWithCors(
      {
        keywords: result.keywords,
        summary: result.summary,
        structure: result.structure,
      },
      { status: 200 },
      [...corsMethods]
    );
  } catch (error) {
    if (error instanceof GeminiApiError) {
      const { body, status } = toGeminiErrorResponse(error);
      return jsonWithCors(body, { status }, [...corsMethods]);
    }

    serverErrorLog("APIルートで予期せぬエラー", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      route: "extract-keywords-summary",
    });
    return jsonWithCors(
      {
        error:
          error instanceof Error
            ? error.message
            : "サーバー内部で予期せぬエラーが発生しました",
      },
      { status: 500 },
      [...corsMethods]
    );
  }
}
