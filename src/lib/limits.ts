export const AI_INPUT_LIMITS = {
  maxTextChars: 100_000,
  maxUrlTextChars: 100_000,
  maxPdfBytes: 20 * 1024 * 1024,
  maxImageBytes: 10 * 1024 * 1024,
} as const;

export function getBase64LengthLimit(byteLimit: number): number {
  return Math.ceil(byteLimit / 3) * 4;
}

export const AI_INPUT_BASE64_LIMITS = {
  maxPdfBase64Chars: getBase64LengthLimit(AI_INPUT_LIMITS.maxPdfBytes),
  maxImageBase64Chars: getBase64LengthLimit(AI_INPUT_LIMITS.maxImageBytes),
} as const;

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)}MB`;
}

export function getMaxFileBytes(fileType: string): number | null {
  if (fileType === "application/pdf") {
    return AI_INPUT_LIMITS.maxPdfBytes;
  }
  if (fileType.startsWith("image/")) {
    return AI_INPUT_LIMITS.maxImageBytes;
  }
  return null;
}

export function getMaxBase64Chars(fileType: string): number | null {
  if (fileType === "application/pdf") {
    return AI_INPUT_BASE64_LIMITS.maxPdfBase64Chars;
  }
  if (fileType.startsWith("image/")) {
    return AI_INPUT_BASE64_LIMITS.maxImageBase64Chars;
  }
  return null;
}

export function assertTextWithinLimit(
  text: string,
  maxChars: number,
  label: string
): void {
  if (text.length > maxChars) {
    throw new Error(
      `${label}が長すぎます。${maxChars.toLocaleString()}文字以内にしてください。`
    );
  }
}

export function assertFileSizeWithinLimit(file: File): void {
  const maxBytes = getMaxFileBytes(file.type);
  if (maxBytes !== null && file.size > maxBytes) {
    throw new Error(
      `${file.type === "application/pdf" ? "PDF" : "画像"}ファイルが大きすぎます。${formatBytes(maxBytes)}以内のファイルを選択してください。`
    );
  }
}

export function validatePayloadSize(
  fileType: string,
  fileContent: string
): string | null {
  if (fileType.startsWith("text/")) {
    return fileContent.length > AI_INPUT_LIMITS.maxTextChars
      ? `テキスト本文が長すぎます。${AI_INPUT_LIMITS.maxTextChars.toLocaleString()}文字以内にしてください。`
      : null;
  }

  const maxBase64Chars = getMaxBase64Chars(fileType);
  if (maxBase64Chars !== null && fileContent.length > maxBase64Chars) {
    return `${fileType === "application/pdf" ? "PDF" : "画像"}ファイルが大きすぎます。アップロード上限内のファイルを選択してください。`;
  }

  return null;
}
