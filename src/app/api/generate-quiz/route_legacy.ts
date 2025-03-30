import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType, keywords, options } = await request.json();

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

    // オプションのデフォルト値を設定
    const count = options?.count || 5;
    const difficulty = options?.difficulty || "medium";
    const category = options?.category || "一般";
    const customPrompt = options?.prompt || "";

    // プロンプトを作成
    let prompt = "";
    if (fileType.startsWith("text/") || fileType === "application/pdf") {
      prompt = `
        以下のテキストと関連キーワードに基づいて、${count}個の4択クイズを作成してください。
        難易度は${
          difficulty === "easy"
            ? "簡単"
            : difficulty === "medium"
            ? "普通"
            : "難しい"
        }にしてください。
        カテゴリは「${category}」です。
        
        各クイズは以下の形式のJSONオブジェクトとして返してください:
        {
          "category": "カテゴリ名",
          "question": "問題文",
          "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
          "correctOptionIndex": 0,
          "explanation": "この問題の解説文。なぜこの答えが正解なのかを説明する"
        }
        
        全てのクイズをJSON配列として返してください。例:
        [
          {
            "category": "カテゴリ名",
            "question": "問題文1",
            "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
            "correctOptionIndex": 0,
            "explanation": "解説文1"
          },
          ...
        ]
        
        ${customPrompt ? `追加の指示: ${customPrompt}` : ""}
        
        テキスト:
        ${fileContent}
        
        関連キーワード:
        ${keywords ? keywords.join(", ") : ""}
      `;
    } else if (fileType.startsWith("image/")) {
      prompt = `
        この画像に基づいて、${count}個の4択クイズを作成してください。
        難易度は${
          difficulty === "easy"
            ? "簡単"
            : difficulty === "medium"
            ? "普通"
            : "難しい"
        }にしてください。
        カテゴリは「${category}」です。
        
        各クイズは以下の形式のJSONオブジェクトとして返してください:
        {
          "category": "カテゴリ名",
          "question": "問題文",
          "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
          "correctOptionIndex": 0,
          "explanation": "この問題の解説文。なぜこの答えが正解なのかを説明する"
        }
        
        全てのクイズをJSON配列として返してください。例:
        [
          {
            "category": "カテゴリ名",
            "question": "問題文1",
            "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
            "correctOptionIndex": 0,
            "explanation": "解説文1"
          },
          ...
        ]
        
        ${customPrompt ? `追加の指示: ${customPrompt}` : ""}
        
        関連キーワード:
        ${keywords ? keywords.join(", ") : ""}
      `;
    }

    // Gemini APIエンドポイントの設定
    const MODEL_ID = "gemini-2.0-flash";
    const GENERATE_CONTENT_API = "generateContent";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`;

    // 送信するペイロードを作成
    // 画像の場合はparts 配列の1要素目にテキスト、2要素目に inlineData を分割して設定
    const parts = fileType.startsWith("image/")
      ? [
          { text: prompt },
          {
            inlineData: {
              mimeType: fileType,
              data: fileContent,
            },
          },
        ]
      : [{ text: prompt }];

    const payload = {
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          description: "生成された4択クイズの配列",
          items: {
            type: "object",
            description: "4択クイズの単一オブジェクト",
            properties: {
              category: {
                type: "string",
                description: "クイズのカテゴリ",
                example: "歴史",
              },
              question: {
                type: "string",
                description: "クイズの問題文",
                example: "日本の初代内閣総理大臣は誰ですか？",
              },
              options: {
                type: "array",
                description: "4つの選択肢の配列",
                items: {
                  type: "string",
                },
                minItems: 4,
                maxItems: 4,
                example: ["伊藤博文", "大隈重信", "山縣有朋", "西園寺公望"],
              },
              correctOptionIndex: {
                type: "integer",
                format: "int32",
                description: "正解の選択肢のインデックス (0から始まる)",
                minimum: 0,
                maximum: 3,
                example: 0,
              },
              explanation: {
                type: "string",
                description: "クイズの解説文",
                example: "伊藤博文は1885年に初代内閣総理大臣に就任しました。",
              },
            },
            required: [
              "category",
              "question",
              "options",
              "correctOptionIndex",
              "explanation",
            ],
          },
        },
      },
    };

    // Gemini APIへリクエスト送信
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

    // APIから返された結果を取得
    const result = await apiResponse.json();
    console.log(JSON.stringify(result, null, 2));
    // 結果は生成されたクイズの配列として返されることを想定
    return NextResponse.json({ quizzes: result.result });
  } catch (error) {
    console.error("クイズ生成中にエラーが発生しました:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "クイズ生成中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
