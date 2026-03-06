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

export class ApiRouteError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(input: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "ApiRouteError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

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

  return NextResponse.json(body, {
    status,
    headers: {
      "x-request-id": requestId
    }
  });
}

export function errorJsonResponse(error: ApiError, requestId: string, status: number) {
  const body: ApiEnvelope<null> = {
    ok: false,
    data: null,
    error,
    request_id: requestId
  };

  return NextResponse.json(body, {
    status,
    headers: {
      "x-request-id": requestId
    }
  });
}

export function withRequestIdHeader<T extends Response>(response: T, requestId: string): T {
  response.headers.set("x-request-id", requestId);
  return response;
}

export function logApiError(request: Request, requestId: string, error: unknown) {
  const pathname = new URL(request.url).pathname;
  console.error(`[api][${requestId}] ${request.method} ${pathname}`, error);
}

export function unexpectedErrorJsonResponse(requestId: string) {
  return errorJsonResponse(
    {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error."
    },
    requestId,
    500
  );
}

export function withApiRoute(
  handler: (request: Request, meta: { requestId: string }) => Promise<Response>
): (request: Request) => Promise<Response>;
export function withApiRoute<TContext>(
  handler: (request: Request, meta: { requestId: string }, context: TContext) => Promise<Response>
): (request: Request, context: TContext) => Promise<Response>;
export function withApiRoute<TContext>(
  handler:
    | ((request: Request, meta: { requestId: string }) => Promise<Response>)
    | ((request: Request, meta: { requestId: string }, context: TContext) => Promise<Response>)
) {
  return async (request: Request, context?: TContext): Promise<Response> => {
    const requestId = createRequestId();

    try {
      const response = await (handler as (
        request: Request,
        meta: { requestId: string },
        context?: TContext
      ) => Promise<Response>)(request, { requestId }, context);
      return withRequestIdHeader(response, requestId);
    } catch (error) {
      if (error instanceof ApiRouteError) {
        return errorJsonResponse(
          {
            code: error.code,
            message: error.message,
            details: error.details
          },
          requestId,
          error.status
        );
      }

      logApiError(request, requestId, error);
      return unexpectedErrorJsonResponse(requestId);
    }
  };
}

export function toSseSuccessEvent<T extends Record<string, unknown>>(
  event: string,
  data: T,
  requestId: string
): string {
  const payload: ApiEnvelope<T> = {
    ok: true,
    data,
    error: null,
    request_id: requestId
  };

  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function toSseErrorEvent(event: string, error: ApiError, requestId: string): string {
  const payload: ApiEnvelope<null> = {
    ok: false,
    data: null,
    error,
    request_id: requestId
  };

  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}
