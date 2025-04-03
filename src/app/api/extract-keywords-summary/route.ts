import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  // HarmCategory,
  // HarmBlockThreshold,
} from "@google/generative-ai"; // HarmCategory, HarmBlockThreshold をインポート（必要に応じて）

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType } = await request.json();

    if (!fileContent) {
      return NextResponse.json(
        { error: "ファイル内容が提供されていません" },
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

    // Gemini APIクライアントを初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    // モデルを指定 (例: gemini-1.5-flash など、利用可能なモデルに変更可能)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // プロンプトを作成 (内容は変更なし)
    let prompt = "";

    if (fileType.startsWith("text/")) {
      // テキストの場合
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
    } else if (fileType === "application/pdf") {
      // PDFの場合
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
    } else if (fileType.startsWith("image/")) {
      // 画像の場合
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
    } else {
      // サポート外のファイルタイプ
      return NextResponse.json(
        { error: "サポートされていないファイルタイプです。" },
        { status: 400 }
      );
    }

    // --- startChat を使用するように変更 ---
    const chatSession = model.startChat({
      // generationConfig: {
      //   // 必要に応じて temperature, topP, topK などを設定
      //   // responseMimeType: "application/json" // モデルがJSON出力をサポートしている場合、パース処理を簡略化できる可能性あり
      // },
      // safetySettings: [ // 必要に応じてセーフティ設定を追加
      //   { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      //   // 他のカテゴリも追加可能
      // ],
      history: [], // 1回のやり取りなので履歴は空で開始
    });

    let sendMessageResponse; // 変数名を変更して明確化

    try {
      if (fileType.startsWith("image/") || fileType === "application/pdf") {
        // 画像またはPDFの場合: プロンプトとインラインデータを配列で渡す
        sendMessageResponse = await chatSession.sendMessage([
          prompt,
          {
            inlineData: {
              mimeType: fileType,
              data: fileContent, // Base64エンコードされたデータ
            },
          },
        ]);
      } else {
        // テキストの場合: プロンプトのみを渡す
        sendMessageResponse = await chatSession.sendMessage(prompt);
      }
    } catch (apiError) {
      console.error("Gemini API呼び出し中にエラーが発生しました:", apiError);
      // APIからのエラーレスポンスに関する詳細情報をログに出力
      if (apiError instanceof Error && "response" in apiError) {
        console.error("API Error Response:", (apiError as any).response);
      }
      return NextResponse.json(
        { error: "AIモデルとの通信中にエラーが発生しました。" },
        { status: 502 } // Bad Gateway or appropriate status
      );
    }
    // --- 変更ここまで ---

    // レスポンスのテキスト部分を取得 (ここは generateContent と同様)
    const resultText = sendMessageResponse.response.text();

    // 結果からJSONを抽出 (以降の処理は変更なし)
    try {
      // 応答テキストの最初に ```json ... ``` が含まれるかチェック
      const jsonBlockMatch = resultText.match(/```json\s*(\{.*?\})\s*```/s);
      let data;

      if (jsonBlockMatch && jsonBlockMatch[1]) {
        // ```json ブロックから抽出
        data = JSON.parse(jsonBlockMatch[1]);
      } else {
        // JSON形式の文字列を直接探す (フォールバック)
        const jsonMatch = resultText.match(/\{.*\}/s);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        }
      }

      if (data) {
        // JSONが正常にパースできた場合
        return NextResponse.json({
          keywords: data.keywords || [],
          summary: data.summary || "",
          structure: data.structure || "",
        });
      } else {
        // JSONが見つからない場合のフォールバック処理 (元のコードと同様)
        console.warn(
          "JSON形式での応答が見つかりませんでした。テキストからの抽出を試みます。"
        );
        console.log("Raw response text:", resultText); // デバッグ用に生テキストを出力

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
              .filter((idx) => idx > keywordsIndex && idx >= 0) // idx >= 0 を追加
              .sort((a, b) => a - b)[0] ?? lines.length; // Nullish coalescing operator

          const keywordsText = lines
            .slice(keywordsIndex + 1, nextSectionIndex)
            .join(" ");

          keywords = keywordsText
            .replace(/^[^\[]*\[|\][^\]]*$/g, "") // 配列の括弧と前後の不要な文字を除去
            .replace(/["']/g, "") // クォーテーションを除去
            .split(/[,、]/) // カンマや読点で分割
            .map((k) => k.trim())
            .filter(Boolean);
        }

        if (summaryIndex >= 0) {
          const nextSectionIndex =
            structureIndex > summaryIndex && structureIndex >= 0
              ? structureIndex
              : lines.length; // idx >= 0 を追加
          summary = lines
            .slice(summaryIndex + 1, nextSectionIndex)
            .join(" ")
            .replace(/^(概要:|summary:)/i, "") // 先頭のラベルを除去
            .trim();
        }

        if (structureIndex >= 0) {
          const prevSectionIndex =
            [keywordsIndex, summaryIndex]
              .filter((idx) => idx < structureIndex && idx >= 0) // idx >= 0 を追加
              .sort((a, b) => b - a)[0] ?? -1; // Nullish coalescing operator
          // 構造の説明が前のセクションの続きでないか確認
          const startLine =
            structureIndex > prevSectionIndex ? structureIndex + 1 : 0;

          structure = lines
            .slice(startLine)
            .join(" ")
            .replace(/^(構成:|構造:|structure:)/i, "") // 先頭のラベルを除去
            .trim();
        }

        // フォールバックの結果、何も抽出できなかった場合の処理を追加
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
      console.log("Raw response text:", resultText); // 解析失敗時も生テキストを出力

      // 解析失敗時は、エラーを示す情報を返す
      return NextResponse.json(
        {
          keywords: [],
          summary: "応答の解析に失敗しました。",
          structure: `モデルからの応答: ${resultText.substring(0, 500)}${
            resultText.length > 500 ? "..." : ""
          }`, // 応答の一部を含める
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
