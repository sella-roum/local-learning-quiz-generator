const isProduction = process.env.NODE_ENV === "production";

export function debugLog(message: string, meta?: Record<string, unknown>) {
  if (!isProduction) {
    console.debug(message, meta);
  }
}

export function serverErrorLog(message: string, meta?: Record<string, unknown>) {
  console.error(message, meta);
}
