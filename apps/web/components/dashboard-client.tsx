"use client";

import { useMemo, useState } from "react";
import { buildApiIntegrationHeaders, readApiIntegrationConfigFromStorage } from "@/lib/api-integrations";
import type { Lang } from "@/lib/i18n-shared";

type QuotaDetails = {
  plan?: string;
  used_today?: number;
  limit_per_day?: number;
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: QuotaDetails;
};

type ApiEnvelope<T extends Record<string, unknown>> = {
  ok: boolean;
  data: T | null;
  error?: ApiErrorPayload | null;
  request_id?: string;
};

type StreamStage = {
  stage: string;
  envelope: ApiEnvelope<Record<string, unknown>>;
};

type Props = {
  lang: Lang;
};

type DashboardCopy = {
  title: string;
  run: string;
  running: string;
  demoHint: string;
  streaming: string;
  viewReport: string;
  analysisFailed: string;
  serviceUnavailable: string;
  requestFailed: string;
  mockHint: string;
  fallbackHint: string;
  stageText: Record<string, string>;
};

const copyByLang: Record<Lang, DashboardCopy> = {
  en: {
    title: "Generate a Viral Report from YouTube URL",
    run: "Run Analysis",
    running: "Analyzing...",
    demoHint: "Demo links return stable preloaded data. Unknown links use synthetic mock data.",
    streaming: "Streaming Progress",
    viewReport: "View Report",
    analysisFailed: "Analysis failed",
    serviceUnavailable: "Could not connect to analysis service",
    requestFailed: "Analyze request failed",
    mockHint:
      "This run used mock YouTube data. Verify the final recommendations against live video metrics before making release decisions.",
    fallbackHint:
      "This run used local fallback analysis because the external AI service was unavailable or intentionally disabled for QA.",
    stageText: {
      fetching_youtube: "Fetching YouTube metadata",
      report_created: "Report record created",
      analysis: "Running structure and comments analysis",
      benchmark: "Running benchmark comparison",
      score: "Calculating Viral Score",
      done: "Analysis completed",
      error: "Analysis failed"
    }
  },
  zh: {
    title: "通过 YouTube 链接生成爆款分析报告",
    run: "开始分析",
    running: "分析中...",
    demoHint: "演示链接会返回稳定预置数据，未知链接会使用合成模拟数据。",
    streaming: "实时进度",
    viewReport: "查看报告",
    analysisFailed: "分析失败",
    serviceUnavailable: "无法连接分析服务",
    requestFailed: "分析请求失败",
    mockHint: "本次分析使用了 mock YouTube 数据。正式发布前，请再用真实视频指标复核建议。",
    fallbackHint: "本次分析使用了本地兜底结果，说明外部 AI 服务当前不可用，或已为 QA 显式关闭。",
    stageText: {
      fetching_youtube: "正在获取 YouTube 元数据",
      report_created: "已创建报告记录",
      analysis: "正在执行结构与评论分析",
      benchmark: "正在执行对标比较",
      score: "正在计算爆款评分",
      done: "分析完成",
      error: "分析失败"
    }
  }
};

function parseEventBlock(block: string): StreamStage | null {
  const lines = block.split("\n").map((line) => line.trim());
  const event = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
  const dataRaw = lines.find((line) => line.startsWith("data:"))?.replace("data:", "").trim();

  if (!event || !dataRaw) {
    return null;
  }

  try {
    return {
      stage: event,
      envelope: JSON.parse(dataRaw) as ApiEnvelope<Record<string, unknown>>
    };
  } catch {
    return null;
  }
}

async function parseResponseError(response: Response, copy: DashboardCopy): Promise<string> {
  let payload: ApiEnvelope<Record<string, unknown>> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<Record<string, unknown>>;
  } catch {
    return copy.serviceUnavailable;
  }

  const message = payload?.error?.message ?? copy.requestFailed;

  if (payload?.error?.code === "USAGE_LIMIT_EXCEEDED") {
    const used = payload.error.details?.used_today;
    const limit = payload.error.details?.limit_per_day;
    if (typeof used === "number" && typeof limit === "number") {
      return `${message} (${used}/${limit})`;
    }
  }

  return message;
}

export function DashboardClient({ lang }: Props) {
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<StreamStage[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);

  const copy = useMemo(() => copyByLang[lang], [lang]);
  const orderedStages = useMemo(() => stages.slice(-6), [stages]);

  function pushNotice(message: string) {
    setNotices((current) => (current.includes(message) ? current : [...current, message]));
  }

  async function onAnalyze() {
    setLoading(true);
    setStages([]);
    setReportId(null);
    setError(null);
    setNotices([]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
        },
        body: JSON.stringify({
          url,
          stream: true
        })
      });

      if (response.status === 401) {
        window.location.href = "/login?next=%2Fdashboard";
        return;
      }

      if (!response.ok) {
        setError(await parseResponseError(response, copy));
        return;
      }

      if (!response.body) {
        throw new Error(copy.serviceUnavailable);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const event = parseEventBlock(chunk);
          if (!event) {
            continue;
          }

          setStages((prev) => [...prev, event]);

          if (event.stage === "report_created") {
            const source = event.envelope.data?.source;
            if (source === "mock_demo" || source === "mock_synthetic") {
              pushNotice(copy.mockHint);
            }
          }

          if (event.stage === "done") {
            const id = event.envelope.data?.reportId;
            if (typeof id === "string") {
              setReportId(id);
              window.dispatchEvent(new CustomEvent("viralbrain:reports-refresh"));
            }

            const fallbackUsed = event.envelope.data?.modelTrace;
            if (
              fallbackUsed &&
              typeof fallbackUsed === "object" &&
              (fallbackUsed as { fallback_used?: unknown }).fallback_used === true
            ) {
              pushNotice(copy.fallbackHint);
            }
          }

          if (event.stage === "error") {
            const message = event.envelope.error?.message;
            const details = event.envelope.error?.details;

            if (
              typeof message === "string" &&
              typeof details?.used_today === "number" &&
              typeof details?.limit_per_day === "number"
            ) {
              setError(`${message} (${details.used_today}/${details.limit_per_day})`);
            } else {
              setError(typeof message === "string" ? message : copy.analysisFailed);
            }
          }
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.analysisFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card panel">
      <h2>{copy.title}</h2>
      <div className="form-row" style={{ marginTop: 12 }}>
        <input
          className="input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          data-testid="analyze-url-input"
        />
        <button className="btn btn-primary" onClick={onAnalyze} disabled={loading} data-testid="run-analysis-button">
          {loading ? copy.running : copy.run}
        </button>
      </div>
      <p className="small">{copy.demoHint}</p>

      {notices.length > 0 ? (
        <div className="qa-banner" data-testid="analysis-notices">
          <ul className="list" style={{ margin: 0 }}>
            {notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {orderedStages.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>{copy.streaming}</h3>
          <ul className="list" data-testid="streaming-stages">
            {orderedStages.map((item, index) => (
              <li key={`${item.stage}-${index}`}>
                <span className="mono">{item.stage}</span> - {copy.stageText[item.stage] ?? item.stage}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="status-failed" style={{ marginTop: 12 }} data-testid="analysis-error">
          {error}
        </p>
      ) : null}

      {reportId ? (
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <a className="btn btn-primary" href={`/report/${reportId}`} data-testid="view-report-button">
            {copy.viewReport}
          </a>
          <span className="small mono">report_id: {reportId}</span>
        </div>
      ) : null}
    </div>
  );
}
