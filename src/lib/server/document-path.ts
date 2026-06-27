import fs from "fs";
import path from "path";

const DOCUMENTS_DIR = path.resolve(process.cwd(), "public", "documents");

export type DocumentFileNameValidationResult =
  | { ok: true; fileName: string }
  | { ok: false; reason: string };

export type ResolveDocumentPathResult =
  | { ok: true; filePath: string }
  | { ok: false; status: 400 | 404; error: string };

function isInsideBaseDir(candidate: string, baseDir: string): boolean {
  const relative = path.relative(baseDir, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function validateDocumentFileName(
  input: string | null
): DocumentFileNameValidationResult {
  if (input === null) {
    return { ok: false, reason: "fileName is required" };
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return { ok: false, reason: "fileName contains invalid URL encoding" };
  }

  const trimmed = decoded.trim();

  if (!trimmed) {
    return { ok: false, reason: "fileName is empty" };
  }

  if (trimmed.includes("\0")) {
    return { ok: false, reason: "fileName contains null byte" };
  }

  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { ok: false, reason: "fileName contains control character" };
  }

  if (path.isAbsolute(trimmed)) {
    return { ok: false, reason: "fileName is an absolute path" };
  }

  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { ok: false, reason: "fileName contains path separator" };
  }

  if (trimmed === "." || trimmed === "..") {
    return { ok: false, reason: "fileName is a directory reference" };
  }

  if (trimmed.includes("..")) {
    return { ok: false, reason: "fileName contains parent directory reference" };
  }

  if (path.extname(trimmed) !== ".md") {
    return { ok: false, reason: "fileName must have .md extension" };
  }

  if (path.basename(trimmed) !== trimmed) {
    return { ok: false, reason: "fileName contains invalid path components" };
  }

  return { ok: true, fileName: trimmed };
}

export async function resolveDocumentPath(
  input: string | null
): Promise<ResolveDocumentPathResult> {
  const validation = validateDocumentFileName(input);

  if (!validation.ok) {
    return { ok: false, status: 400, error: "Invalid document fileName" };
  }

  const candidatePath = path.resolve(DOCUMENTS_DIR, validation.fileName);

  if (!isInsideBaseDir(candidatePath, DOCUMENTS_DIR)) {
    return {
      ok: false,
      status: 400,
      error: "Invalid document fileName",
    };
  }

  let resolvedRealPath: string;
  try {
    resolvedRealPath = await fs.promises.realpath(candidatePath);
  } catch {
    return { ok: false, status: 404, error: "Document not found" };
  }

  let normalizedBaseDir: string;
  try {
    normalizedBaseDir = await fs.promises.realpath(DOCUMENTS_DIR);
  } catch {
    return { ok: false, status: 400, error: "Invalid document fileName" };
  }

  if (!isInsideBaseDir(resolvedRealPath, normalizedBaseDir)) {
    return {
      ok: false,
      status: 400,
      error: "Invalid document fileName",
    };
  }

  return { ok: true, filePath: resolvedRealPath };
}
