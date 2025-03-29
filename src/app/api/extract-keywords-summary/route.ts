import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // プロンプトを作成
    let prompt = "";

    if (fileType.startsWith("text/") || fileType === "application/pdf") {
      // テキストまたはPDFの場合
      prompt = `
        以下のテキストを分析して、以下の2つの情報を抽出してください。
        1. 重要なキーワードを10〜15個。キーワードは単語または短いフレーズで、このテキストの主要な概念や用語を表すものにしてください。
        2. テキストの概要を100〜200文字程度で。

        以下のJSON形式で返してください:
        {
          "keywords": ["キーワード1", "キーワード2", ...],
          "summary": "テキストの概要..."
        }
        
        テキスト:
        ${fileContent}
      `;
    } else if (fileType.startsWith("image/")) {
      // 画像の場合
      prompt = `
        この画像を分析して、以下の2つの情報を抽出してください。
        1. 重要なキーワードを5〜10個。キーワードは単語または短いフレーズで、この画像の主要な要素や概念を表すものにしてください。
        2. 画像の概要を100文字程度で。

        以下のJSON形式で返してください:
        {
          "keywords": ["キーワード1", "キーワード2", ...],
          "summary": "画像の概要..."
        }
      `;
    }

    // Gemini APIを呼び出す
    let response;

    if (fileType.startsWith("image/")) {
      // 画像の場合
      response = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: fileType,
            data: fileContent,
          },
        },
      ]);
    } else {
      // テキストの場合
      response = await model.generateContent(prompt);
    }

    const result = response.response.text();

    // 結果からJSONを抽出
    try {
      // JSON形式の文字列を抽出
      const jsonMatch = result.match(/\{.*\}/s);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          keywords: data.keywords || [],
          summary: data.summary || "",
        });
      } else {
        // フォールバック: テキストから抽出を試みる
        const lines = result
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const keywordsIndex = lines.findIndex(
          (line) =>
            line.includes("キーワード") ||
            line.toLowerCase().includes("keywords")
        );
        const summaryIndex = lines.findIndex(
          (line) =>
            line.includes("概要") || line.toLowerCase().includes("summary")
        );

        let keywords: string[] = [];
        let summary = "";

        if (keywordsIndex >= 0) {
          const keywordsText = lines
            .slice(
              keywordsIndex + 1,
              summaryIndex >= 0 ? summaryIndex : undefined
            )
            .join(" ");
          keywords = keywordsText
            .replace(/[[\]"']/g, "")
            .split(/[,、]/)
            .map((k) => k.trim())
            .filter(Boolean);
        }

        if (summaryIndex >= 0) {
          summary = lines
            .slice(summaryIndex + 1)
            .join(" ")
            .trim();
        }

        return NextResponse.json({ keywords, summary });
      }
    } catch (error) {
      console.error("結果の解析に失敗しました:", error);
      console.log("生の結果:", result);

      return NextResponse.json({
        keywords: [],
        summary: "解析に失敗しました。",
      });
    }
  } catch (error) {
    console.error("キーワードと概要の抽出中にエラーが発生しました:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "キーワードと概要の抽出中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
