import { NextResponse } from "next/server";

export type HttpMethod = "GET" | "POST" | "OPTIONS";

function getAllowedOrigin(): string {
  return (
    process.env.FRONTEND_URL?.trim() ||
    process.env.ACCESS_CONTROL_ALLOW_ORIGIN?.trim() ||
    "http://localhost:3000"
  );
}

export function setCorsHeaders(
  response: NextResponse,
  methods: HttpMethod[]
): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", getAllowedOrigin());
  response.headers.set(
    "Access-Control-Allow-Methods",
    Array.from(new Set([...methods, "OPTIONS"])).join(", ")
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export function createOptionsResponse(methods: HttpMethod[]): NextResponse {
  return setCorsHeaders(new NextResponse(null, { status: 204 }), methods);
}

export function jsonWithCors(
  body: unknown,
  init: ResponseInit,
  methods: HttpMethod[]
): NextResponse {
  return setCorsHeaders(NextResponse.json(body, init), methods);
}
