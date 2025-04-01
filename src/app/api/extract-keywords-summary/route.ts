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

    if (fileType.startsWith("text/")) {
      // テキストの場合
      prompt = `
        以下のテキストを分析して、以下の3つの情報を抽出してください。
        1. 重要なキーワードを10〜15個。キーワードは単語または短いフレーズで、このテキストの主要な概念や用語を表すものにしてください。
        2. テキストの概要を100〜200文字程度で。
        3. テキストの構成や章立て、主要なセクションなどの構造を200文字程度で説明してください。

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
        3. PDFの構成や章立て、主要なセクションなどの構造を200文字程度で説明してください。

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
        3. 画像の構成要素や配置、視覚的な構造を100文字程度で説明してください。

        以下のJSON形式で返してください:
        {
          "keywords": ["キーワード1", "キーワード2", ...],
          "summary": "画像の概要...",
          "structure": "画像の構成要素や配置、視覚的な構造の説明..."
        }
      `;
    }

    // Gemini APIを呼び出す
    let response;

    if (fileType.startsWith("image/") || fileType === "application/pdf") {
      // 画像またはPDFの場合
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
          structure: data.structure || "",
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
              .filter((idx) => idx > keywordsIndex)
              .sort((a, b) => a - b)[0] || lines.length;

          const keywordsText = lines
            .slice(keywordsIndex + 1, nextSectionIndex)
            .join(" ");

          keywords = keywordsText
            .replace(/[[\]"']/g, "")
            .split(/[,、]/)
            .map((k) => k.trim())
            .filter(Boolean);
        }

        if (summaryIndex >= 0) {
          const nextSectionIndex =
            structureIndex > summaryIndex ? structureIndex : lines.length;
          summary = lines
            .slice(summaryIndex + 1, nextSectionIndex)
            .join(" ")
            .trim();
        }

        if (structureIndex >= 0) {
          structure = lines
            .slice(structureIndex + 1)
            .join(" ")
            .trim();
        }

        return NextResponse.json({ keywords, summary, structure });
      }
    } catch (error) {
      console.error("結果の解析に失敗しました:", error);
      console.log("生の結果:", result);

      return NextResponse.json({
        keywords: [],
        summary: "解析に失敗しました。",
        structure: "",
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
