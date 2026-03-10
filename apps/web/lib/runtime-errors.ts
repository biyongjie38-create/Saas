export function toUserFacingRuntimeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "UNKNOWN_ERROR");

  if (message === "YOUTUBE_KEY_MISSING") {
    return "Missing YouTube Data API key. Connect your own YouTube key in the API panel before running live workflows.";
  }

  if (message === "YT_API_FAILED") {
    return "Failed to fetch live YouTube data. Check API quota, key restrictions, and outbound network access.";
  }

  if (message === "YT_REQUEST_TIMEOUT") {
    return "Timed out while connecting to YouTube. Check outbound network access, proxy settings, and firewall rules.";
  }

  if (message === "YOUTUBE_COLLECT_EMPTY") {
    return "Live viral collection returned no results for the current filters. Broaden the time window, lower the view threshold, or switch region.";
  }

  if (message === "YOUTUBE_TRENDS_EMPTY") {
    return "Live hot trends returned no recent rows for the current region.";
  }

  if (message === "AI_SERVICE_LOCAL_MODE_DISABLED") {
    return "Production mode requires the external AI service. Start apps/ai-service and disable local-only AI mode.";
  }

  if (message === "AI_SERVICE_REQUEST_TIMEOUT") {
    return "The request exceeded the web server timeout while waiting for the external AI service to finish.";
  }

  if (message === "AI_PROVIDER_LOCAL_MODE_DISABLED") {
    return "Production mode requires a real model provider. Connect your own OpenAI-compatible credentials before running analysis.";
  }

  if (message === "AI_PROVIDER_CREDENTIALS_MISSING") {
    return "Missing model provider credentials. Connect your own OpenAI-compatible key, base URL, and model names in the API panel.";
  }

  if (message === "RAG_PROVIDER_CREDENTIALS_MISSING") {
    return "Missing embedding or Pinecone credentials. Connect your own embedding model and Pinecone settings to enable benchmark retrieval.";
  }

  if (message === "AI_PROVIDER_REQUEST_FAILED") {
    return "The model provider request failed. Check provider credentials, quota, and outbound network access.";
  }

  if (message === "AI_PROVIDER_REQUEST_TIMEOUT") {
    return "The model provider timed out before finishing the response.";
  }

  if (message === "RAG_PROVIDER_REQUEST_FAILED") {
    return "Vector retrieval failed. Check Pinecone connectivity, embedding credentials, and outbound network access.";
  }

  const aiServiceMatch = message.match(/^AI_SERVICE_(\d{3})$/);
  if (aiServiceMatch) {
    return `External AI service returned HTTP ${aiServiceMatch[1]}. Check apps/ai-service, provider credentials, and network access.`;
  }

  return message;
}
