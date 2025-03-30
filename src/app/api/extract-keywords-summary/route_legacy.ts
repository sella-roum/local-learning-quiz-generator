// app/api/generate/route.js (または pages/api/generate.js)
import { NextRequest, NextResponse } from "next/server";

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
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    // プロンプトを作成（ファイルの種類によって内容を変化）
    let prompt = "";
    if (fileType.startsWith("text/") || fileType === "application/pdf") {
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

    // Gemini APIのエンドポイントおよびペイロードの構築
    const MODEL_ID = "gemini-2.0-flash";
    const GENERATE_CONTENT_API = "streamGenerateContent";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            fileType.startsWith("image/")
              ? {
                  text: prompt,
                  inlineData: {
                    mimeType: fileType,
                    data: fileContent,
                  },
                }
              : {
                  text: prompt,
                },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          description: "抽出されたキーワードと概要を含むレスポンス",
          properties: {
            keywords: {
              type: "array",
              description:
                "抽出されたキーワードの配列。テキストの場合は10〜15個、画像の場合は5〜10個が目安。",
              items: {
                type: "string",
              },
            },
            summary: {
              type: "string",
              description:
                "抽出されたコンテンツの概要。テキストの場合は100〜200文字、画像の場合は100文字程度が目安。",
            },
          },
          required: ["keywords", "summary"],
        },
      },
    };

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return NextResponse.json(
        { error: errorText },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();
    return NextResponse.json(data);
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
