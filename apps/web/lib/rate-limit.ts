import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { errorJsonResponse } from "@/lib/api-response";

type WindowConfig = {
  label: `${number} ${"s" | "m" | "h"}`;
  ms: number;
};

type RateLimitInput = {
  request: Request;
  requestId: string;
  namespace: string;
  userId?: string | null;
  maxRequests: number;
  window: WindowConfig;
  message: string;
};

type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; response: Response };

type LocalBucket = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __viralbrainRateLimitStore: Map<string, LocalBucket> | undefined;
  // eslint-disable-next-line no-var
  var __viralbrainRateLimiters: Map<string, Ratelimit> | undefined;
}

const localStore = globalThis.__viralbrainRateLimitStore ?? new Map<string, LocalBucket>();
globalThis.__viralbrainRateLimitStore = localStore;

const rateLimiterCache = globalThis.__viralbrainRateLimiters ?? new Map<string, Ratelimit>();
globalThis.__viralbrainRateLimiters = rateLimiterCache;

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function hasUpstashConfig() {
  return Boolean(readEnv("UPSTASH_REDIS_REST_URL") && readEnv("UPSTASH_REDIS_REST_TOKEN"));
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const candidate = forwardedFor.split(",")[0]?.trim();
    if (candidate) {
      return candidate;
    }
  }

  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function buildIdentifier(request: Request, namespace: string, userId?: string | null) {
  return userId ? `${namespace}:user:${userId}` : `${namespace}:ip:${getClientIp(request)}`;
}

function getRateLimiter(namespace: string, maxRequests: number, window: WindowConfig) {
  const cacheKey = `${namespace}:${maxRequests}:${window.label}`;
  const cached = rateLimiterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(maxRequests, window.label),
    prefix: `viralbrain:${namespace}`,
    analytics: false
  });
  rateLimiterCache.set(cacheKey, limiter);
  return limiter;
}

function withRateLimitHeaders(response: Response, limit: number, remaining: number, resetAt: number) {
  response.headers.set("x-ratelimit-limit", String(limit));
  response.headers.set("x-ratelimit-remaining", String(Math.max(0, remaining)));
  response.headers.set("x-ratelimit-reset", String(Math.ceil(resetAt / 1000)));
  response.headers.set("retry-after", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
  return response;
}

async function runUpstashLimit(identifier: string, namespace: string, maxRequests: number, window: WindowConfig) {
  const limiter = getRateLimiter(namespace, maxRequests, window);
  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    limit: result.limit,
    resetAt: result.reset
  };
}

function runLocalLimit(identifier: string, maxRequests: number, window: WindowConfig) {
  const now = Date.now();
  const current = localStore.get(identifier);

  if (!current || current.resetAt <= now) {
    const fresh = {
      count: 1,
      resetAt: now + window.ms
    };
    localStore.set(identifier, fresh);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      limit: maxRequests,
      resetAt: fresh.resetAt
    };
  }

  current.count += 1;
  localStore.set(identifier, current);

  return {
    allowed: current.count <= maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    limit: maxRequests,
    resetAt: current.resetAt
  };
}

export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitDecision> {
  const identifier = buildIdentifier(input.request, input.namespace, input.userId);
  const result = hasUpstashConfig()
    ? await runUpstashLimit(identifier, input.namespace, input.maxRequests, input.window)
    : runLocalLimit(identifier, input.maxRequests, input.window);

  if (result.allowed) {
    return { allowed: true };
  }

  const response = errorJsonResponse(
    {
      code: "RATE_LIMITED",
      message: input.message,
      details: {
        namespace: input.namespace,
        limit: result.limit,
        remaining: result.remaining,
        reset_at: new Date(result.resetAt).toISOString(),
        provider: hasUpstashConfig() ? "upstash" : "local"
      }
    },
    input.requestId,
    429
  );

  return {
    allowed: false,
    response: withRateLimitHeaders(response, result.limit, result.remaining, result.resetAt)
  };
}
