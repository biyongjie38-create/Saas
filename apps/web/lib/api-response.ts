import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiEnvelope<T> = {
  ok: boolean;
  data: T | null;
  error: ApiError | null;
  request_id: string;
};

export function createRequestId(): string {
  return randomUUID();
}

export function okJsonResponse<T>(data: T, requestId: string, status = 200) {
  const body: ApiEnvelope<T> = {
    ok: true,
    data,
    error: null,
    request_id: requestId
  };

  return NextResponse.json(body, { status });
}

export function errorJsonResponse(error: ApiError, requestId: string, status: number) {
  const body: ApiEnvelope<null> = {
    ok: false,
    data: null,
    error,
    request_id: requestId
  };

  return NextResponse.json(body, { status });
}
