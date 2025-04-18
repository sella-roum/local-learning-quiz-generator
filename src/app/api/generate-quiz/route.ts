import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  // HarmCategory,
  // HarmBlockThreshold,
} from "@google/generative-ai"; // HarmCategory, HarmBlockThreshold をインポート（必要に応じて）

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileType, keywords, summary, structure, options } =
      await request.json();

    // fileContent も summary もない場合はエラー
    if (!fileContent && !summary) {
      return NextResponse.json(
        { error: "ファイル内容または概要が提供されていません" },
        { status: 400 }
      );
    }
    // fileContent があるのに fileType がない場合はエラー (画像/PDFの場合に必須)
    if (fileContent && !fileType) {
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

    // オプションのデフォルト値を設定
    const count = options?.count || 5;
    const difficulty = options?.difficulty || "medium";
    const category = options?.category || "一般";
    const customPrompt = options?.prompt || "";

    // Gemini APIクライアントを初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    // モデルを指定 (例: gemini-1.5-flash など、利用可能なモデルに変更可能)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-04-17",
    });

    // プロンプトを作成 (内容は変更なし)
    let prompt = "";
    const difficultyText =
      difficulty === "easy"
        ? "簡単"
        : difficulty === "medium"
        ? "普通"
        : "難しい";
    const jsonFormatString = "```json ```";
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

    // ファイルタイプに基づいてプロンプトのベースを作成
    if (
      fileType &&
      (fileType.startsWith("text/") || fileType === "application/pdf")
    ) {
      prompt = `
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
    } else if (fileType && fileType.startsWith("image/")) {
      prompt = `
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
    } else if (!fileContent && summary) {
      // ファイルがなく、概要情報のみの場合
      prompt = `
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
    } else {
      // ファイルタイプが不明またはサポート外で、ファイルコンテンツがある場合
      // (このケースはエラーチェックで弾かれているはずだが念のため)
      return NextResponse.json(
        {
          error:
            "サポートされていないファイルタイプか、ファイル情報が不完全です。",
        },
        { status: 400 }
      );
    }

    // --- startChat を使用するように変更 ---
    const chatSession = model.startChat({
      // generationConfig: {
      //   responseMimeType: "application/json", // モデルがサポートしていればJSONで直接受け取れる可能性
      // },
      // safetySettings: [ // 必要に応じてセーフティ設定を追加
      //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      // ],
      history: [], // 1回のやり取りなので履歴は空
    });

    let sendMessageResponse;
    try {
      const messageParts: any[] = [prompt]; // プロンプトは必ず含む

      // fileContent があり、画像またはPDFの場合、inlineData を追加
      if (
        fileContent &&
        fileType &&
        (fileType.startsWith("image/") || fileType === "application/pdf")
      ) {
        messageParts.push({
          inlineData: {
            mimeType: fileType,
            data: fileContent, // Base64エンコードされたデータ
          },
        });
      }
      // メッセージを送信 (テキストのみ、またはプロンプト+ファイル)
      sendMessageResponse = await chatSession.sendMessage(messageParts);
    } catch (apiError) {
      console.error("Gemini API呼び出し中にエラーが発生しました:", apiError);
      if (apiError instanceof Error && "response" in apiError) {
        console.error("API Error Response:", (apiError as any).response);
      }
      // API呼び出し自体のエラー
      return NextResponse.json(
        { error: "AIモデルとの通信中にエラーが発生しました。" },
        { status: 502 } // Bad Gateway など適切なステータスコード
      );
    }
    // --- 変更ここまで ---

    // レスポンスのテキスト部分を取得
    const resultText = sendMessageResponse.response.text();
    console.log({ resultText });
    // 結果からクイズ配列を抽出
    let quizzes = [];
    try {
      // マークダウンの ```json [...] ``` ブロックを探す
      const jsonBlockMatch = resultText.match(/```json\s*(\[.*?\])\s*```/s);
      let jsonString = null;

      if (jsonBlockMatch && jsonBlockMatch[1]) {
        // マークダウンブロックからJSON文字列を抽出
        jsonString = jsonBlockMatch[1];
        console.log("クイズJSONをマークダウンブロックから抽出しました。");
      } else {
        // マークダウンブロックが見つからない場合、応答全体から直接JSON配列を探す
        const jsonArrayMatch = resultText.match(/\[.*\]/s);
        if (jsonArrayMatch && jsonArrayMatch[0]) {
          jsonString = jsonArrayMatch[0];
          console.log("クイズJSONをテキスト全体から抽出しました。");
        } else {
          console.warn("応答からJSON配列が見つかりませんでした。");
          console.log("Raw response text:", resultText);
          throw new Error(
            "生成された応答から有効なJSON形式のクイズ配列が見つかりませんでした。"
          );
        }
      }

      // 抽出したJSON文字列をパース
      if (jsonString) {
        try {
          quizzes = JSON.parse(jsonString);
          // パース後の形式チェック (配列であり、要素がオブジェクトであることを確認)
          if (
            !Array.isArray(quizzes) ||
            !quizzes.every((q) => typeof q === "object" && q !== null)
          ) {
            console.error(
              "パース結果が期待される配列形式ではありません:",
              quizzes
            );
            throw new Error(
              "抽出されたJSONは有効なクイズ配列形式ではありません。"
            );
          }
        } catch (parseError) {
          console.error(
            "抽出したJSON文字列のパースに失敗しました:",
            parseError
          );
          console.log("抽出試行文字列:", jsonString); // パース試行文字列を出力
          console.log("Raw response text:", resultText);
          throw new Error(
            `クイズ生成結果のJSONパースに失敗しました。エラー: ${
              parseError instanceof Error ? parseError.message : parseError
            }`
          );
        }
      } else {
        // ここに来る場合は上のチェックで Error が throw されているはずだが念のため
        throw new Error("抽出可能なJSON文字列が見つかりませんでした。");
      }
    } catch (error) {
      console.error(
        "クイズ生成結果の解析または検証中にエラーが発生しました:",
        error
      );
      // エラー発生時は、エラー情報と生の応答テキスト（一部）を返す
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "クイズ生成結果の解析に失敗しました",
          rawResponsePrefix:
            resultText.substring(0, 500) +
            (resultText.length > 500 ? "..." : ""), // デバッグ用に一部応答を含める
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
