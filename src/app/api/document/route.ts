import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { resolveDocumentPath } from "@/lib/server/document-path";
import { serverErrorLog } from "@/lib/server/safe-logger";
import { createOptionsResponse, jsonWithCors } from "@/lib/server/cors";

const corsMethods = ["GET"] as const;

export async function OPTIONS() {
  return createOptionsResponse([...corsMethods]);
}

// GETリクエストハンドラ
export async function GET(request: NextRequest) {
  const fileName = request.nextUrl.searchParams.get("fileName");
  const resolved = await resolveDocumentPath(fileName);

  if (!resolved.ok) {
    return jsonWithCors(
      { error: resolved.error },
      { status: resolved.status },
      [...corsMethods]
    );
  }

  try {
    let markdownContent = await fs.promises.readFile(resolved.filePath, "utf-8");
    markdownContent = markdownContent.replace(
      /images\//g,
      "/documents/images/"
    );

    return jsonWithCors(
      { content: markdownContent },
      { status: 200 },
      [...corsMethods]
    );
  } catch (error) {
    serverErrorLog("Failed to read markdown file", {
      route: "document",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined,
    });
    return jsonWithCors(
      { error: "Failed to read document" },
      { status: 500 },
      [...corsMethods]
    );
  }
}
