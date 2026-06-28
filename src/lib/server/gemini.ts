import {
  GoogleGenAI,
  type Content,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from "@google/genai";
import { getGeminiModelConfig } from "@/lib/server/gemini-config";
import { debugLog, serverErrorLog } from "@/lib/server/safe-logger";

export interface GeminiJsonRequest {
  route: string;
  contents: Content[];
  config: GenerateContentConfig;
  requireJsonArray?: boolean;
  requireJsonObject?: boolean;
}

export interface GeminiJsonResult<T> {
  response: GenerateContentResponse;
  text: string;
  data: T;
  modelId: string;
}

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

function parseGeminiJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch?.[1]) {
      return JSON.parse(jsonBlockMatch[1]);
    }
    throw new Error("Gemini response is not valid JSON");
  }
}

export async function generateGeminiJson<T>(
  request: GeminiJsonRequest
): Promise<GeminiJsonResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiApiError(
      "Gemini APIキーが設定されていません。",
      500,
      "GEMINI_API_KEY_MISSING"
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const { modelIdsToTry, enableThinking, thinkingBudget, thinkingModelIds } =
    getGeminiModelConfig();

  let geminiResponse: GenerateContentResponse | null = null;
  let parsedData: unknown = null;
  let lastError: unknown = null;
  let usedModelId = "";

  for (const modelId of modelIdsToTry) {
    console.log(`モデル ${modelId} で${request.route}API呼び出しを試行します...`);
    usedModelId = modelId;
    try {
      const generationConfig: GenerateContentConfig = {
        ...request.config,
      };
      if (enableThinking && thinkingModelIds.includes(modelId)) {
        generationConfig.thinkingConfig = { thinkingBudget };
      }

      const currentResponse = await ai.models.generateContent({
        model: modelId,
        contents: request.contents,
        config: generationConfig,
      });

      const resultText = currentResponse.text;
      debugLog(`モデル ${modelId} からの応答`, {
        responseLength: resultText?.length ?? 0,
      });

      if (resultText) {
        let parsed: unknown;
        try {
          parsed = parseGeminiJson(resultText);
        } catch {
          console.warn(`モデル ${modelId} の応答JSONパースに失敗しました。`);
          lastError = new Error(`モデル ${modelId} の応答JSONパースに失敗しました。`);
          continue;
        }

        if (request.requireJsonArray && !Array.isArray(parsed)) {
          console.warn(`モデル ${modelId} の応答が配列形式ではありません。`);
          lastError = new Error(`モデル ${modelId} の応答が配列形式ではありません。`);
          continue;
        }

        if (request.requireJsonObject && (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))) {
          console.warn(`モデル ${modelId} の応答がオブジェクト形式ではありません。`);
          lastError = new Error(`モデル ${modelId} の応答がオブジェクト形式ではありません。`);
          continue;
        }

        geminiResponse = currentResponse;
        parsedData = parsed;
        console.log(`モデル ${modelId} で成功しました。`);
        break;
      } else {
        console.warn(`モデル ${modelId} からの応答が空でした。`);
        if (currentResponse.promptFeedback?.blockReason) {
          console.error(
            `モデル ${modelId} でリクエストがブロックされました: ${currentResponse.promptFeedback.blockReason}`
          );
          geminiResponse = currentResponse;
          break;
        }
        lastError = new Error(
          `モデル ${modelId} から有効なコンテンツが得られませんでした。`
        );
      }
    } catch (apiError) {
      lastError = apiError;
      serverErrorLog(`モデル ${modelId} での${request.route}API呼び出しエラー`, {
        modelId,
        errorName: apiError instanceof Error ? apiError.name : "UnknownError",
        route: request.route,
      });
    }
  }

  if (!geminiResponse || !geminiResponse.text) {
    const blockReason = geminiResponse?.promptFeedback?.blockReason;
    const errorMsg = blockReason
      ? `リクエストがブロックされました: ${blockReason}`
      : "AIモデルとの通信に失敗しました。";
    const status = blockReason ? 400 : 502;
    serverErrorLog(errorMsg, {
      blockReason: blockReason ?? undefined,
      route: request.route,
    });

    throw new GeminiApiError(
      errorMsg,
      status,
      blockReason ? "BLOCKED" : "API_COMMUNICATION_ERROR"
    );
  }

  if (parsedData === null) {
    throw new GeminiApiError(
      "AIからの応答形式が不正です (JSONパース失敗)。",
      500,
      "JSON_PARSE_ERROR"
    );
  }

  const data = parsedData as T;

  return {
    response: geminiResponse,
    text: geminiResponse.text,
    data,
    modelId: usedModelId,
  };
}

export function toGeminiErrorResponse(error: unknown): {
  body: Record<string, unknown>;
  status: number;
} {
  if (error instanceof GeminiApiError) {
    return {
      body: {
        error: error.message,
        code: error.code,
      },
      status: error.status,
    };
  }

  return {
    body: { error: "AIモデルとの通信に失敗しました。" },
    status: 502,
  };
}
