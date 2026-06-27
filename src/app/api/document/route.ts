import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { resolveDocumentPath } from "@/lib/server/document-path";
import { serverErrorLog } from "@/lib/server/safe-logger";

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
  const resolved = await resolveDocumentPath(fileName);

  if (!resolved.ok) {
    const errorResponse = NextResponse.json(
      { error: resolved.error },
      { status: resolved.status }
    );
    return setCorsHeaders(errorResponse);
  }

  try {
    let markdownContent = await fs.promises.readFile(resolved.filePath, "utf-8");
    // 画像パスの置換 (Render環境でも /documents/images/ を参照するように)
    markdownContent = markdownContent.replace(
      /images\//g,
      "/documents/images/"
    );

    const response = NextResponse.json({ content: markdownContent });
    return setCorsHeaders(response);
  } catch (error) {
    serverErrorLog("Failed to read markdown file", {
      route: "document",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined,
    });
    const errorResponse = NextResponse.json(
      { error: "Failed to read document" },
      { status: 500 }
    );
    return setCorsHeaders(errorResponse);
  }
}
