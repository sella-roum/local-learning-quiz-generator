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

// クイズの型定義 (レスポンスの検証用)
interface Quiz {
  category: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType, keywords, summary, structure, options } =
      await request.json();

    // 入力チェック
    if (!fileContent && !summary) {
      return NextResponse.json(
        { error: "ファイル内容または概要が提供されていません" },
        { status: 400 }
      );
    }
    if (fileContent && !fileType) {
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

    // オプション設定
    const count = options?.count || 5;
    const difficulty = options?.difficulty || "medium";
    const category = options?.category || "一般";
    const customPrompt = options?.prompt || "";
    const difficultyText =
      difficulty === "easy"
        ? "簡単"
        : difficulty === "medium"
        ? "普通"
        : "難しい";

    // @google/genai クライアント初期化
    const ai = new GoogleGenAI({ apiKey });

    // --- 試行するモデルIDのリスト ---
    const modelIdsToTry = [
      "gemini-2.5-flash-preview-04-17", // 最初に試すモデル
      "gemini-2.0-flash", // フォールバックモデル
      // 必要に応じてさらに追加可能 (例: "gemini-1.5-flash-latest")
    ];
    const thinkingModelIds = ["gemini-2.5-flash-preview-04-17"];

    // --- responseSchema の定義 (クイズ配列用) ---
    const quizSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "クイズのカテゴリ名" },
        question: { type: Type.STRING, description: "クイズの問題文" },
        options: {
          type: Type.ARRAY,
          description: "4つの選択肢の文字列配列",
          items: { type: Type.STRING },
          minItems: "4", // 選択肢は4つ
          maxItems: "4",
        },
        correctOptionIndex: {
          type: Type.INTEGER,
          description: "正解の選択肢のインデックス (0-3)",
          minimum: 0,
          maximum: 3,
        },
        explanation: { type: Type.STRING, description: "問題の解説文" },
      },
      required: [
        "category",
        "question",
        "options",
        "correctOptionIndex",
        "explanation",
      ],
    };

    const quizResponseSchema: Schema = {
      type: Type.ARRAY,
      description: `生成された${count}個のクイズオブジェクトの配列`,
      items: quizSchema,
      minItems: String(count), // 指定された数のクイズを要求
      maxItems: String(count),
    };

    // JSON形式の指示
    const jsonFormatString = "```json ```"; // プロンプト内で使用
    const jsonFormatInstruction = `
各クイズは以下の形式のJSONオブジェクトとして返してください:
{
  "category": "カテゴリ名",
  "question": "問題文",
  "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "correctOptionIndex": 0, // 0から3の整数で、正解の選択肢のインデックス
  "explanation": "この問題の解説文。なぜこの答えが正解なのかを説明する"
}

全てのクイズをJSON配列として返してください。例:
[
  { /* クイズ1 */ },
  { /* クイズ2 */ },
  ...
]

マークダウンの ${jsonFormatString} ブロックで囲んでください。
`;

    // プロンプトとコンテンツパーツの準備
    let promptBase = "";
    const parts: Part[] = [];

    if (
      fileType &&
      (fileType.startsWith("text/") || fileType === "application/pdf")
    ) {
      promptBase = `
以下のテキストと関連情報に基づいて、${count}個の4択クイズを作成してください。
難易度は${difficultyText}にしてください。
カテゴリは「${category}」です。

${jsonFormatInstruction}

${customPrompt ? `追加の指示: ${customPrompt}` : ""}

テキスト:
${fileContent || "テキストは提供されていません。"}

テキストの概要:
${summary || ""}

テキストの構成:
${structure || ""}

関連キーワード:
${keywords ? keywords.join(", ") : ""}
    `;
      if (fileType.startsWith("text/")) {
        parts.push({ text: promptBase });
      } else {
        parts.push({ text: promptBase });
        parts.push({
          inlineData: {
            mimeType: fileType,
            data: fileContent,
          },
        });
      }
    } else if (fileType && fileType.startsWith("image/")) {
      promptBase = `
この画像に基づいて、${count}個の4択クイズを作成してください。
難易度は${difficultyText}にしてください。
カテゴリは「${category}」です。

${jsonFormatInstruction}

${customPrompt ? `追加の指示: ${customPrompt}` : ""}

画像の概要:
${summary || ""}

画像の構成:
${structure || ""}

関連キーワード:
${keywords ? keywords.join(", ") : ""}
    `;
      parts.push({ text: promptBase });
      parts.push({
        inlineData: {
          mimeType: fileType,
          data: fileContent,
        },
      });
    } else if (!fileContent && summary) {
      promptBase = `
以下の概要情報に基づいて、${count}個の4択クイズを作成してください。
難易度は${difficultyText}にしてください。
カテゴリは「${category}」です。

${jsonFormatInstruction}

${customPrompt ? `追加の指示: ${customPrompt}` : ""}

概要:
${summary}

構成:
${structure || ""}

関連キーワード:
${keywords ? keywords.join(", ") : ""}
    `;
      parts.push({ text: promptBase });
    } else {
      return NextResponse.json(
        { error: "ファイル情報が不完全またはサポート外です。" },
        { status: 400 }
      );
    }

    const requestContents: Content[] = [{ role: "user", parts }];

    // --- API呼び出しとリトライ処理 ---
    let response: GenerateContentResponse | null = null;
    let lastError: any = null;

    for (const modelId of modelIdsToTry) {
      console.log(`モデル ${modelId} でAPI呼び出しを試行します...`);
      try {
        // 生成設定 - JSON出力を期待
        const generationConfig: GenerateContentConfig = {
          responseMimeType: "application/json",
          responseSchema: quizResponseSchema,
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

    // 結果からクイズ配列を抽出
    let quizzes: Quiz[] = [];
    try {
      let jsonString: string | null = null;

      // 1. responseMimeType: "application/json" を指定したので、直接パースを試みる
      try {
        const parsedData = JSON.parse(resultText);
        if (Array.isArray(parsedData)) {
          jsonString = resultText;
          console.log("クイズJSONを直接パースしました。");
        } else {
          console.warn("直接パース結果が配列ではありませんでした。");
        }
      } catch (directParseError) {
        console.warn(
          "直接のJSONパースに失敗しました。マークダウンブロックを探します。",
          directParseError
        );
      }

      // 2. マークダウンの ```json [...] ``` ブロックを探す (フォールバック)
      if (!jsonString) {
        const jsonBlockMatch = resultText.match(/```json\s*(\[.*?\])\s*```/s);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          jsonString = jsonBlockMatch[1];
          console.log("クイズJSONをマークダウンブロックから抽出しました。");
        }
      }

      // 3. 応答全体から直接JSON配列を探す (フォールバック)
      if (!jsonString) {
        const jsonArrayMatch = resultText.match(/(\[.*\])/s);
        if (jsonArrayMatch && jsonArrayMatch[1]) {
          try {
            JSON.parse(jsonArrayMatch[1]);
            jsonString = jsonArrayMatch[1];
            console.log("クイズJSONをテキスト全体から抽出しました。");
          } catch (e) {
            console.warn(
              "正規表現で抽出した文字列は有効なJSON配列ではありませんでした。"
            );
          }
        }
      }

      // 抽出したJSON文字列をパース
      if (jsonString) {
        try {
          const parsedQuizzes = JSON.parse(jsonString);
          // パース後の形式チェック
          if (
            !Array.isArray(parsedQuizzes) ||
            !parsedQuizzes.every(
              (q): q is Quiz =>
                typeof q === "object" &&
                q !== null &&
                typeof q.category === "string" &&
                typeof q.question === "string" &&
                Array.isArray(q.options) &&
                q.options.length === 4 &&
                q.options.every((opt: unknown) => typeof opt === "string") &&
                typeof q.correctOptionIndex === "number" &&
                q.correctOptionIndex >= 0 &&
                q.correctOptionIndex < 4 &&
                typeof q.explanation === "string"
            )
          ) {
            console.error(
              "パース結果が期待されるクイズ配列形式ではありません:",
              parsedQuizzes
            );
            throw new Error(
              "抽出されたJSONは有効なクイズ配列形式ではありません。"
            );
          }
          quizzes = parsedQuizzes;
        } catch (parseError) {
          console.error(
            "抽出したJSON文字列のパースまたは検証に失敗しました:",
            parseError
          );
          console.log("抽出試行文字列:", jsonString);
          throw new Error(
            `クイズ生成結果のJSONパースまたは検証に失敗しました。エラー: ${
              parseError instanceof Error ? parseError.message : parseError
            }`
          );
        }
      } else {
        console.warn("応答からJSON配列が見つかりませんでした。");
        console.log("Raw response text:", resultText);
        throw new Error(
          "生成された応答から有効なJSON形式のクイズ配列が見つかりませんでした。"
        );
      }
    } catch (error) {
      console.error(
        "クイズ生成結果の解析または検証中にエラーが発生しました:",
        error
      );
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "クイズ生成結果の解析に失敗しました",
          rawResponsePrefix:
            resultText.substring(0, 500) +
            (resultText.length > 500 ? "..." : ""),
        },
        { status: 500 }
      );
    }

    // 正常にクイズが抽出・パースできた場合
    return NextResponse.json({ quizzes });
  } catch (error) {
    // APIルート全体の予期せぬエラー
    console.error("クイズ生成APIで予期せぬエラーが発生しました:", error);
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
