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
        以下のテキストから重要なキーワードを10〜15個抽出してください。
        キーワードは単語または短いフレーズで、このテキストの主要な概念や用語を表すものにしてください。
        キーワードのみをJSON配列形式で返してください。例: ["キーワード1", "キーワード2", ...]
        
        テキスト:
        ${fileContent}
      `;
    } else if (fileType.startsWith("image/")) {
      // 画像の場合
      prompt = `
        この画像から重要なキーワードを5〜10個抽出してください。
        キーワードは単語または短いフレーズで、この画像の主要な要素や概念を表すものにしてください。
        キーワードのみをJSON配列形式で返してください。例: ["キーワード1", "キーワード2", ...]
      `;
    }

    // Gemini APIを呼び出す
    let response;

    if (fileType.startsWith("image/")) {
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

    // 結果からキーワード配列を抽出
    let keywords: string[] = [];
    try {
      // JSON形式の文字列を抽出
      const jsonMatch = result.match(/\[.*\]/s);
      if (jsonMatch) {
        keywords = JSON.parse(jsonMatch[0]);
      } else {
        // 行ごとに分割して処理
        keywords = result
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.includes(":"))
          .map((line) => line.replace(/^["'\s-]+|["'\s-]+$/g, "")); // 引用符や箇条書き記号を削除
      }
    } catch (error) {
      console.error("キーワード抽出結果の解析に失敗しました:", error);
      console.log("生の結果:", result);

      // フォールバック: 単純に行ごとに分割
      keywords = result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 15); // 最大15個まで
    }

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("キーワード抽出中にエラーが発生しました:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "キーワード抽出中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
