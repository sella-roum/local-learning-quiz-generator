import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType, keywords, summary, structure, options } =
      await request.json();

    if (!fileContent && !summary) {
      return NextResponse.json(
        { error: "ファイル内容または概要が提供されていません" },
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

    // オプションのデフォルト値を設定
    const count = options?.count || 5;
    const difficulty = options?.difficulty || "medium";
    const category = options?.category || "一般";
    const customPrompt = options?.prompt || "";

    // Gemini APIクライアントを初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // プロンプトを作成
    let prompt = "";

    if (fileType.startsWith("text/") || fileType === "application/pdf") {
      // テキストまたはPDFの場合
      prompt = `
      以下のテキストと関連情報に基づいて、${count}個の4択クイズを作成してください。
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
        "correctOptionIndex": 0, // 0から3の整数で、正解の選択肢のインデックス
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
      ${fileContent || "テキストは提供されていません。"}
      
      テキストの概要:
      ${summary || ""}
      
      テキストの構成:
      ${structure || ""}
      
      関連キーワード:
      ${keywords ? keywords.join(", ") : ""}
    `;
    } else if (fileType.startsWith("image/")) {
      // 画像の場合も同様に修正
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
        "correctOptionIndex": 0, // 0から3の整数で、正解の選択肢のインデックス
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
      
      画像の概要:
      ${summary || ""}
      
      画像の構成:
      ${structure || ""}
      
      関連キーワード:
      ${keywords ? keywords.join(", ") : ""}
    `;
    }

    // Gemini APIを呼び出す
    let response;

    if (fileType.startsWith("image/") || fileType === "application/pdf") {
      // 画像またはPDFの場合
      try {
        response = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: fileType,
              data: fileContent,
            },
          },
        ]);
      } catch (error) {
        console.error("Gemini API呼び出しエラー:", error);
        // 画像/PDF処理に失敗した場合はテキストのみで再試行
        response = await model.generateContent(prompt);
      }
    } else {
      // テキストの場合
      response = await model.generateContent(prompt);
    }

    const result = response.response.text();

    // 結果からクイズ配列を抽出
    let quizzes = [];
    try {
      // JSON形式の文字列を抽出
      const jsonMatch = result.match(/\[.*\]/s);
      if (jsonMatch) {
        quizzes = JSON.parse(jsonMatch[0]);
      } else {
        // JSONが見つからない場合は、テキスト全体をJSONとして解析を試みる
        try {
          quizzes = JSON.parse(result);
        } catch (innerError) {
          console.error("JSONパース失敗:", innerError);
          throw new Error("クイズ生成結果のJSONパースに失敗しました");
        }
      }
    } catch (error) {
      console.error("クイズ生成結果の解析に失敗しました:", error);
      console.log("生の結果:", result);
      return NextResponse.json(
        { error: "クイズ生成結果の解析に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ quizzes });
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
