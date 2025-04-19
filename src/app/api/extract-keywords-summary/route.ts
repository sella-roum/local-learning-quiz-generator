import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  Part,
  GenerateContentConfig,
  Schema,
  Type,
  // HarmCategory, // 必要ならインポート
  // HarmBlockThreshold, // 必要ならインポート
} from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    // 入力は fileContent と fileType のみ
    const { fileContent, fileType } = await request.json();

    // 入力チェック
    if (!fileContent) {
      return NextResponse.json(
        { error: "ファイル内容が提供されていません" },
        { status: 400 }
      );
    }
    if (!fileType) {
      return NextResponse.json(
        { error: "ファイルタイプが指定されていません" },
        { status: 400 }
      );
    }

    // APIキー取得
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    // @google/genai クライアント初期化
    const ai = new GoogleGenAI({ apiKey });

    // --- 試行するモデルIDのリスト ---
    const modelIdsToTry = [
      "gemini-2.5-flash-preview-04-17", // 最初に試すモデル
      "gemini-2.0-flash", // フォールバックモデル
      // 必要に応じてさらに追加可能 (例: "gemini-1.5-flash-latest")
    ];
    const thinkingModelIds = ["gemini-2.5-flash-preview-04-17"];

    // --- responseSchema の定義 ---
    const analysisResponseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        keywords: {
          type: Type.ARRAY,
          description:
            "抽出された重要なキーワード（単語または短いフレーズ）のリスト。",
          items: {
            type: Type.STRING,
          },
        },
        summary: {
          type: Type.STRING,
          description: "テキストまたは画像の概要（指定された文字数程度）。",
        },
        structure: {
          type: Type.STRING,
          description:
            "テキストの構成や章立て、または画像の構成要素や配置などの構造に関する詳細な説明。",
        },
      },
      required: ["keywords", "summary", "structure"], // すべて必須とする
    };

    // プロンプトとコンテンツパーツの準備
    let prompt = "";
    const requestContents: Content[] = [];
    const parts: Part[] = [];

    if (fileType.startsWith("text/")) {
      prompt = `
        以下のテキストを分析して、以下の3つの情報を抽出してください。
        1. 重要なキーワードを10〜15個。キーワードは単語または短いフレーズで、このテキストの主要な概念や用語を表すものにしてください。
        2. テキストの概要を100〜200文字程度で。
        3. テキストの構成や章立て、主要なセクションなどの構造を200文字以上で、なるべく詳細に説明してください。

        以下のJSON形式で返してください:
        {
          "keywords": ["キーワード1", "キーワード2", ...],
          "summary": "テキストの概要...",
          "structure": "テキストの構成や章立て、主要なセクションなどの構造の説明..."
        }

        テキスト:
        ${fileContent}
      `;
      parts.push({ text: prompt });
    } else if (fileType === "application/pdf") {
      prompt = `
        このPDFを分析して、以下の3つの情報を抽出してください。
        1. 重要なキーワードを10〜15個。キーワードは単語または短いフレーズで、このPDFの主要な概念や用語を表すものにしてください。
        2. PDFの概要を100〜200文字程度で。
        3. PDFの構成や章立て、主要なセクションなどの構造を200文字以上で、なるべく詳細に説明してください。

        以下のJSON形式で返してください:
        {
          "keywords": ["キーワード1", "キーワード2", ...],
          "summary": "PDFの概要...",
          "structure": "PDFの構成や章立て、主要なセクションなどの構造の説明..."
        }
      `;
      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: fileType,
          data: fileContent, // Base64
        },
      });
    } else if (fileType.startsWith("image/")) {
      prompt = `
        この画像を分析して、以下の3つの情報を抽出してください。
        1. 重要なキーワードを5〜10個。キーワードは単語または短いフレーズで、この画像の主要な要素や概念を表すものにしてください。
        2. 画像の概要を100文字程度で。
        3. 画像の構成要素や配置、視覚的な構造を100文字以上で、なるべく詳細に説明してください。

        以下のJSON形式で返してください:
        {
          "keywords": ["キーワード1", "キーワード2", ...],
          "summary": "画像の概要...",
          "structure": "画像の構成要素や配置、視覚的な構造の説明..."
        }
      `;
      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: fileType,
          data: fileContent, // Base64
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
    let lastError: any = null;

    for (const modelId of modelIdsToTry) {
      console.log(`モデル ${modelId} でAPI呼び出しを試行します...`);
      try {
        // 生成設定 - JSON出力を期待
        const generationConfig: GenerateContentConfig = {
          responseMimeType: "application/json",
          responseSchema: analysisResponseSchema,
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
        console.log(`モデル ${modelId} からの応答テキスト:`, resultText);

        if (resultText) {
          response = currentResponse;
          console.log(`モデル ${modelId} で成功しました。`);
          break;
        } else {
          console.warn(`モデル ${modelId} からの応答が空でした。`);
          if (currentResponse.promptFeedback?.blockReason) {
            console.error(
              `モデル ${modelId} でリクエストがブロックされました: ${currentResponse.promptFeedback.blockReason}`
            );
            response = currentResponse; // ブロックされたレスポンスを保持
            break;
          }
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
            console.warn(
              `モデル ${modelId} から予期しない応答形式が返されました。`
            );
            lastError = new Error(
              `モデル ${modelId} から予期しない応答形式が返されました。`
            );
          }
        }
      } catch (apiError) {
        lastError = apiError;
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
      }
    }
    // --- リトライ処理ここまで ---

    // すべてのモデルで失敗した場合、またはブロックされた場合
    if (!response || !response.text) {
      if (response?.promptFeedback?.blockReason) {
        console.error("リクエストがブロックされました。");
        return NextResponse.json(
          {
            error: `リクエストがブロックされました: ${response.promptFeedback.blockReason}`,
          },
          { status: 400 }
        );
      } else {
        console.error("すべてのモデルでAPI呼び出しに失敗しました。");
        return NextResponse.json(
          {
            error: "AIモデルとの通信に失敗しました。",
            details: lastError instanceof Error ? lastError.message : lastError,
          },
          { status: 502 }
        );
      }
    }

    // 成功したレスポンスのテキスト部分を取得
    const resultText = response.text;

    // 結果からJSONを抽出 (キーワード・概要・構造)
    try {
      let data;
      try {
        data = JSON.parse(resultText);
      } catch (initialParseError) {
        console.warn(
          "直接のJSONパースに失敗しました。フォールバック処理を試みます。",
          initialParseError
        );
        const jsonBlockMatch = resultText.match(/```json\s*(\{.*?\})\s*```/s);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          try {
            data = JSON.parse(jsonBlockMatch[1]);
          } catch (blockParseError) {
            console.error(
              "```json ブロックのパースに失敗しました。",
              blockParseError
            );
          }
        } else {
          try {
            data = JSON.parse(resultText);
          } catch (fallbackParseError) {
            console.error(
              "フォールバックのJSONパースにも失敗しました。",
              fallbackParseError
            );
          }
        }
      }

      if (data && typeof data === "object") {
        // JSONが正常にパースできた場合
        return NextResponse.json({
          keywords: data.keywords || [],
          summary: data.summary || "",
          structure: data.structure || "",
        });
      } else {
        // JSONが見つからない、またはパースに失敗した場合のフォールバック処理
        console.warn(
          "JSON形式での応答が見つからないか、パースに失敗しました。テキストからの抽出を試みます。"
        );
        console.log("Raw response text:", resultText);

        const lines = resultText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        // (元のフォールバックロジック)
        const keywordsIndex = lines.findIndex(
          (line) =>
            line.includes("キーワード") ||
            line.toLowerCase().includes("keywords")
        );
        const summaryIndex = lines.findIndex(
          (line) =>
            line.includes("概要") || line.toLowerCase().includes("summary")
        );
        const structureIndex = lines.findIndex(
          (line) =>
            line.includes("構成") ||
            line.includes("構造") ||
            line.toLowerCase().includes("structure")
        );

        let keywords: string[] = [];
        let summary = "";
        let structure = "";

        if (keywordsIndex >= 0) {
          const nextSectionIndex =
            [summaryIndex, structureIndex]
              .filter((idx) => idx > keywordsIndex && idx >= 0)
              .sort((a, b) => a - b)[0] ?? lines.length;

          const keywordsText = lines
            .slice(keywordsIndex + 1, nextSectionIndex)
            .join(" ");

          keywords = keywordsText
            .replace(/^[^\[]*\[|\][^\]]*$/g, "")
            .replace(/["']/g, "")
            .split(/[,、]/)
            .map((k) => k.trim())
            .filter(Boolean);
        }

        if (summaryIndex >= 0) {
          const nextSectionIndex =
            structureIndex > summaryIndex && structureIndex >= 0
              ? structureIndex
              : lines.length;
          summary = lines
            .slice(summaryIndex + 1, nextSectionIndex)
            .join(" ")
            .replace(/^(概要:|summary:)/i, "")
            .trim();
        }

        if (structureIndex >= 0) {
          const prevSectionIndex =
            [keywordsIndex, summaryIndex]
              .filter((idx) => idx < structureIndex && idx >= 0)
              .sort((a, b) => b - a)[0] ?? -1;
          const startLine =
            structureIndex > prevSectionIndex ? structureIndex + 1 : 0;

          structure = lines
            .slice(startLine)
            .join(" ")
            .replace(/^(構成:|構造:|structure:)/i, "")
            .trim();
        }

        if (keywords.length === 0 && !summary && !structure) {
          console.error("フォールバック処理でも情報の抽出に失敗しました。");
          return NextResponse.json({
            keywords: [],
            summary:
              "情報の抽出に失敗しました。モデルの応答を確認してください。",
            structure: "",
          });
        }

        return NextResponse.json({ keywords, summary, structure });
      }
    } catch (parseError) {
      console.error("結果の解析中にエラーが発生しました:", parseError);
      console.log("Raw response text:", resultText);

      return NextResponse.json(
        {
          keywords: [],
          summary: "応答の解析に失敗しました。",
          structure: `モデルからの応答: ${resultText.substring(0, 500)}${
            resultText.length > 500 ? "..." : ""
          }`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("APIルートで予期せぬエラーが発生しました:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "サーバー内部で予期せぬエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
