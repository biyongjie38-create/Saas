"use client";

import { useMemo, useState } from "react";

type StreamStage = {
  stage: string;
  payload: Record<string, unknown>;
};

type ApiErrorEnvelope = {
  ok: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: {
      plan?: string;
      used_today?: number;
      limit_per_day?: number;
    };
  } | null;
  request_id?: string;
};

const stageText: Record<string, string> = {
  fetching_youtube: "Fetching YouTube metadata",
  report_created: "Report record created",
  analysis: "Running structure and comments analysis",
  benchmark: "Running benchmark comparison",
  score: "Calculating Viral Score",
  done: "Analysis completed",
  error: "Analysis failed"
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
      payload: JSON.parse(dataRaw) as Record<string, unknown>
    };
  } catch {
    return null;
  }
}

async function parseResponseError(response: Response): Promise<string> {
  let payload: ApiErrorEnvelope | null = null;

  try {
    payload = (await response.json()) as ApiErrorEnvelope;
  } catch {
    return "Could not connect to analysis service";
  }

  const message = payload?.error?.message ?? "Analyze request failed";

  if (payload?.error?.code === "USAGE_LIMIT_EXCEEDED") {
    const used = payload.error.details?.used_today;
    const limit = payload.error.details?.limit_per_day;
    if (typeof used === "number" && typeof limit === "number") {
      return `${message} (${used}/${limit} used today)`;
    }
  }

  return message;
}

export function DashboardClient() {
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<StreamStage[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedStages = useMemo(() => stages.slice(-6), [stages]);

  async function onAnalyze() {
    setLoading(true);
    setStages([]);
    setReportId(null);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
        setError(await parseResponseError(response));
        return;
      }

      if (!response.body) {
        throw new Error("Could not connect to analysis service");
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

          if (event.stage === "done") {
            const id = event.payload.reportId;
            if (typeof id === "string") {
              setReportId(id);
            }
          }

          if (event.stage === "error") {
            const message = event.payload.message;
            setError(typeof message === "string" ? message : "Analysis failed");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card panel">
      <h2>Generate a Viral Report from YouTube URL</h2>
      <div className="form-row" style={{ marginTop: 12 }}>
        <input
          className="input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <button className="btn btn-primary" onClick={onAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>
      <p className="small">
        Demo links return stable preloaded data. Unknown links use synthetic mock data.
      </p>

      {orderedStages.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Streaming Progress</h3>
          <ul className="list">
            {orderedStages.map((item, index) => (
              <li key={`${item.stage}-${index}`}>
                <span className="mono">{item.stage}</span> - {stageText[item.stage] ?? item.stage}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="status-failed" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}

      {reportId && (
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <a className="btn btn-primary" href={`/report/${reportId}`}>
            View Report
          </a>
          <span className="small mono">report_id: {reportId}</span>
        </div>
      )}
    </div>
  );
}
