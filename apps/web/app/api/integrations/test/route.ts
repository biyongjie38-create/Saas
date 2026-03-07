import { z } from "zod";
import { okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import {
  normalizeApiIntegrationConfig,
  type ApiIntegrationConfig
} from "@/lib/api-integrations";
import { assertPlanAllowsProvider } from "@/lib/plan-access";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const schema = z.object({
  target: z.enum(["youtube", "llm", "pinecone", "all"]).default("all"),
  config: z.unknown()
});

type TestResult = {
  ok: boolean;
  message: string;
  detail?: string;
};

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done() {
      clearTimeout(timer);
    }
  };
}

function normalizeBaseUrl(input: string): string {
  const value = input.trim();
  if (!value) {
    return "";
  }
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeHost(input: string): string {
  const value = input.trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}

async function testYoutube(config: ApiIntegrationConfig): Promise<TestResult> {
  if (!config.youtubeApiKey) {
    return { ok: false, message: "Missing YouTube API key." };
  }

  const timeout = withTimeout(8000);
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", "dQw4w9WgXcQ");
    url.searchParams.set("key", config.youtubeApiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      signal: timeout.signal
    });

    if (!response.ok) {
      return { ok: false, message: `YouTube API returned ${response.status}.` };
    }

    return { ok: true, message: "YouTube API key is valid." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "YouTube API test failed."
    };
  } finally {
    timeout.done();
  }
}

async function testLlm(config: ApiIntegrationConfig): Promise<TestResult> {
  if (!config.openaiApiKey) {
    return { ok: false, message: "Missing LLM API key." };
  }
  if (!config.openaiBaseUrl) {
    return { ok: false, message: "Missing LLM base URL." };
  }

  const timeout = withTimeout(8000);
  try {
    const response = await fetch(`${normalizeBaseUrl(config.openaiBaseUrl)}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`
      },
      cache: "no-store",
      signal: timeout.signal
    });

    if (!response.ok) {
      return { ok: false, message: `LLM provider returned ${response.status}.` };
    }

    const payload = (await response.json().catch(() => null)) as { data?: Array<{ id?: string }> } | null;
    return {
      ok: true,
      message: `LLM provider connected (${config.llmProvider}).`,
      detail: payload?.data?.[0]?.id ?? config.analysisModel
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "LLM provider test failed."
    };
  } finally {
    timeout.done();
  }
}

async function testPinecone(config: ApiIntegrationConfig): Promise<TestResult> {
  if (!config.pineconeApiKey) {
    return { ok: false, message: "Missing Pinecone API key." };
  }
  if (!config.pineconeIndexHost) {
    return { ok: false, message: "Missing Pinecone index host." };
  }

  const timeout = withTimeout(8000);
  try {
    const response = await fetch(`${normalizeHost(config.pineconeIndexHost)}/describe_index_stats`, {
      method: "GET",
      headers: {
        "Api-Key": config.pineconeApiKey,
        Accept: "application/json"
      },
      cache: "no-store",
      signal: timeout.signal
    });

    if (!response.ok) {
      return { ok: false, message: `Pinecone returned ${response.status}.` };
    }

    return {
      ok: true,
      message: "Pinecone connection is valid.",
      detail: config.pineconeNamespace || "viral-library"
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Pinecone test failed."
    };
  } finally {
    timeout.done();
  }
}

export const POST = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new Error("INVALID_INTEGRATION_TEST_PAYLOAD");
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const config = normalizeApiIntegrationConfig(parsed.data.config);
  assertPlanAllowsProvider(user.plan, config);

  const results: Record<string, TestResult> = {};
  if (parsed.data.target === "youtube" || parsed.data.target === "all") {
    results.youtube = await testYoutube(config);
  }
  if (parsed.data.target === "llm" || parsed.data.target === "all") {
    results.llm = await testLlm(config);
  }
  if (parsed.data.target === "pinecone" || parsed.data.target === "all") {
    results.pinecone = await testPinecone(config);
  }

  return okJsonResponse(
    {
      results,
      plan: user.plan
    },
    requestId
  );
});

