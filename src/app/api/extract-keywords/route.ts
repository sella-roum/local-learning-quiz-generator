import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  Part,
  GenerateContentConfig,
  Schema,
  Type,
  // HarmCategory,
  // HarmBlockThreshold,
} from "@google/genai";

// クイズの型定義 (レスポンスの検証用) - このコードでは使用しないが、前の例から残す
// interface Quiz {
//   category: string;
//   question: string;
//   options: string[];
//   correctOptionIndex: number;
//   explanation: string;
// }

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType } = await request.json(); // keywords, summary, structure, options はこのコードでは不要

    if (!fileContent) {
      return NextResponse.json(
        { error: "ファイル内容が提供されていません" },
        { status: 400 }
      );
    }
    // fileType チェックを追加
    if (!fileType) {
      return NextResponse.json(
        { error: "ファイルタイプが指定されていません" },
        { status: 400 }
      );
    }

    // Gemini APIキーを環境変数から取得
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    // @google/genai クライアントを初期化
    const ai = new GoogleGenAI({ apiKey });

    // --- 試行するモデルIDのリスト ---
    const modelIdsToTry = [
      "gemini-2.5-flash-preview-04-17", // 最初に試すモデル
      "gemini-2.0-flash", // フォールバックモデル
      // 必要に応じてさらに追加可能 (例: "gemini-1.5-flash-latest")
    ];
    const thinkingModelIds = ["gemini-2.5-flash-preview-04-17"];

    // --- responseSchema の定義 (キーワード配列用) ---
    const keywordsResponseSchema: Schema = {
      type: Type.ARRAY,
      description:
        "抽出された重要なキーワード（単語または短いフレーズ）の文字列配列。",
      items: {
        type: Type.STRING,
        description: "個々のキーワード文字列",
      },
    };

    // プロンプトを作成
    let prompt = "";
    const requestContents: Content[] = [];
    const parts: Part[] = [];

    if (fileType.startsWith("text/")) {
      prompt = `
        以下のテキストから重要なキーワードを10〜15個抽出してください。
        キーワードは単語または短いフレーズで、このテキストの主要な概念や用語を表すものにしてください。
        キーワードのみをJSON配列形式で返してください。例: ["キーワード1", "キーワード2", ...]

        テキスト:
        ${fileContent}
      `;
      parts.push({ text: prompt });
    } else if (fileType === "application/pdf") {
      prompt = `
        このPDFから重要なキーワードを10〜15個抽出してください。
        キーワードは単語または短いフレーズで、このPDFの主要な概念や用語を表すものにしてください。
        キーワードのみをJSON配列形式で返してください。例: ["キーワード1", "キーワード2", ...]
      `;
      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: fileType,
          data: fileContent,
        },
      });
    } else if (fileType.startsWith("image/")) {
      prompt = `
        この画像から重要なキーワードを5〜10個抽出してください。
        キーワードは単語または短いフレーズで、この画像の主要な要素や概念を表すものにしてください。
        キーワードのみをJSON配列形式で返してください。例: ["キーワード1", "キーワード2", ...]
      `;
      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: fileType,
          data: fileContent,
        },
      });
    } else {
      return NextResponse.json(
        { error: "サポートされていないファイルタイプです。" },
        { status: 400 }
      );
    }

    requestContents.push({ role: "user", parts });

    // --- API呼び出しとリトライ処理 ---
    let response: GenerateContentResponse | null = null;
    let lastError: any = null; // 最後に発生したエラーを保持

    for (const modelId of modelIdsToTry) {
      console.log(`モデル ${modelId} でAPI呼び出しを試行します...`);
      try {
        // 生成設定 - JSON出力を期待
        const generationConfig: GenerateContentConfig = {
          responseMimeType: "application/json",
          responseSchema: keywordsResponseSchema,
        };
        // thinkingモデルであれば、思考トークンを付与
        if (thinkingModelIds.includes(modelId)) {
          // generationConfig.thinkingConfig = {
          //   thinkingBudget: 24576,
          // };
        }

        const currentResponse = await ai.models.generateContent({
          model: modelId,
          contents: requestContents,
          config: generationConfig,
        });

        const resultText = currentResponse.text;
        console.log(`モデル ${modelId} からの応答テキスト:`, resultText); // 応答をログ出力

        // 応答が空でないか、ブロックされていないかを確認
        if (resultText) {
          response = currentResponse; // 成功したレスポンスを保持
          console.log(`モデル ${modelId} で成功しました。`);
          break; // 成功したらループを抜ける
        } else {
          console.warn(`モデル ${modelId} からの応答が空でした。`);
          // ブロックされた場合はリトライしない（他のモデルでもブロックされる可能性が高いため）
          if (currentResponse.promptFeedback?.blockReason) {
            console.error(
              `モデル ${modelId} でリクエストがブロックされました: ${currentResponse.promptFeedback.blockReason}`
            );
            // ブロックされたレスポンスを保持してループを抜ける（後でエラー処理）
            response = currentResponse;
            break;
          }
          // candidates が空、または content がない場合も考慮
          if (
            !currentResponse.candidates ||
            currentResponse.candidates.length === 0 ||
            !currentResponse.candidates[0].content
          ) {
            console.warn(
              `モデル ${modelId} から有効なコンテンツが得られませんでした。`
            );
            lastError = new Error(
              `モデル ${modelId} から有効なコンテンツが得られませんでした。`
            );
          } else {
            // その他の理由で resultText が空の場合
            console.warn(
              `モデル ${modelId} から予期しない応答形式が返されました。`
            );
            lastError = new Error(
              `モデル ${modelId} から予期しない応答形式が返されました。`
            );
          }
        }
      } catch (apiError) {
        lastError = apiError; // エラーを保持
        console.error(
          `モデル ${modelId} でのAPI呼び出し中にエラーが発生しました:`,
          apiError
        );
        if (apiError instanceof Error) {
          console.error(
            `API Error Details (${modelId}):`,
            JSON.stringify(apiError, null, 2)
          );
        }
        // 次のモデルでリトライ
      }
    }

    // --- リトライ処理ここまで ---

    // すべてのモデルで失敗した場合、またはブロックされた場合
    if (!response || !response.text) {
      if (response?.promptFeedback?.blockReason) {
        // ブロックされた場合のエラーレスポンス
        console.error("リクエストがブロックされました。");
        return NextResponse.json(
          {
            error: `リクエストがブロックされました: ${response.promptFeedback.blockReason}`,
          },
          { status: 400 }
        );
      } else {
        // その他の理由で有効な応答が得られなかった場合
        console.error("すべてのモデルでAPI呼び出しに失敗しました。");
        return NextResponse.json(
          {
            error: "AIモデルとの通信に失敗しました。",
            details: lastError instanceof Error ? lastError.message : lastError,
          },
          { status: 502 } // Bad Gateway or appropriate status
        );
      }
    }

    // 成功したレスポンスのテキスト部分を取得
    const resultText = response.text;

    // 結果からキーワード配列を抽出 (以降の処理は変更なし)
    let keywords: string[] = [];
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(resultText);
        if (Array.isArray(parsedData)) {
          keywords = parsedData.filter(
            (item): item is string => typeof item === "string"
          );
        } else {
          console.warn(
            "JSONレスポンスが期待される配列形式ではありませんでした。",
            parsedData
          );
          if (
            typeof parsedData === "object" &&
            parsedData !== null &&
            Array.isArray(parsedData.keywords)
          ) {
            keywords = parsedData.keywords.filter(
              (item: unknown): item is string => typeof item === "string"
            );
          }
        }
      } catch (initialParseError) {
        console.warn(
          "直接のJSONパースに失敗しました。フォールバック処理を試みます。",
          initialParseError
        );
        const jsonBlockMatch = resultText.match(/```json\s*(\[.*?\])\s*```/s);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          try {
            parsedData = JSON.parse(jsonBlockMatch[1]);
            if (Array.isArray(parsedData)) {
              keywords = parsedData.filter(
                (item): item is string => typeof item === "string"
              );
            }
          } catch (blockParseError) {
            console.warn(
              "```json ブロックのパースに失敗しました。",
              blockParseError
            );
          }
        }

        if (keywords.length === 0) {
          const jsonMatch = resultText.match(/(\[.*\])/s);
          if (jsonMatch && jsonMatch[1]) {
            try {
              parsedData = JSON.parse(jsonMatch[1]);
              if (Array.isArray(parsedData)) {
                keywords = parsedData.filter(
                  (item): item is string => typeof item === "string"
                );
              }
            } catch (regexParseError) {
              console.warn(
                "正規表現で抽出したJSON配列のパースに失敗しました。",
                regexParseError
              );
            }
          }
        }
      }

      if (keywords.length === 0) {
        console.warn(
          "JSON配列が見つかりませんでした。行ごとの抽出を試みます。"
        );
        keywords = resultText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.includes(":"))
          .map((line) => line.replace(/^["'\s*-]+|["'\s*-]+$/g, ""))
          .filter(Boolean);
      }
    } catch (error) {
      console.error(
        "キーワード抽出結果の解析中に予期せぬエラーが発生しました:",
        error
      );
      console.log("生の結果:", resultText);
      keywords = resultText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 15);
    }

    if (keywords.length === 0) {
      console.error("キーワードの抽出に失敗しました。");
      return NextResponse.json({ keywords: [] });
    }

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error(
      "キーワード抽出APIルートで予期せぬエラーが発生しました:",
      error
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "キーワード抽出中に予期せぬエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
