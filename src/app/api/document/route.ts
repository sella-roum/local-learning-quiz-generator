import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

// 環境変数からフロントエンドのURLを取得（Renderで設定したもの）
const allowedOrigin = process.env.FRONTEND_URL;

// CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse): NextResponse {
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  } else {
    // 開発環境など、FRONTEND_URLが設定されていない場合は '*' を許可（本番では非推奨）
    // もしくは、ローカル開発用のURL 'http://localhost:3000' を許可する
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.ACCESS_CONTROL_ALLOW_ORIGIN || "http://localhost:3000"
    );
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS"); // このルートはGETのみ
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

// OPTIONSリクエストハンドラ (プリフライトリクエスト用)
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}

// GETリクエストハンドラ
export async function GET(request: NextRequest) {
  const fileName = request.nextUrl.searchParams.get("fileName");
  const filePath = path.join(
    process.cwd(),
    "public",
    "documents",
    fileName || ""
  );
  try {
    let markdownContent = fs.readFileSync(filePath, "utf-8");
    // 画像パスの置換 (Render環境でも /documents/images/ を参照するように)
    markdownContent = markdownContent.replace(
      /images\//g,
      "/documents/images/"
    );

    let response = NextResponse.json({ content: markdownContent });
    // setCorsHeadersがNextResponse<unknown>を返すため、型アサーションで具体的な型を指定
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Failed to read markdown file:", error);
    let errorResponse = NextResponse.json(
      { error: "Failed to read document" },
      { status: 500 }
    );
    // setCorsHeadersがNextResponse<unknown>を返すため、型アサーションで具体的な型を指定
    return setCorsHeaders(errorResponse);
  }
}
