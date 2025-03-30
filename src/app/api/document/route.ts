import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

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
    markdownContent = markdownContent.replace(
      /images\//g,
      "/documents/images/"
    );
    return NextResponse.json({ content: markdownContent });
  } catch (error) {
    console.error("Failed to read markdown file:", error);
    return NextResponse.json(
      { error: "Failed to read document" },
      { status: 500 }
    );
  }
}
