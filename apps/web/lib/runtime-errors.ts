export function toUserFacingRuntimeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "UNKNOWN_ERROR");

  if (message === "YOUTUBE_KEY_MISSING") {
    return "Missing YouTube Data API key. Configure it on the collector page or on the server before running live workflows.";
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

  if (message === "AI_PROVIDER_LOCAL_MODE_DISABLED") {
    return "Production mode requires a real model provider. Disable AI_PROVIDER=local and configure OpenAI-compatible credentials.";
  }

  if (message === "AI_PROVIDER_CREDENTIALS_MISSING") {
    return "Missing model provider credentials. In BYOK mode, connect your own OpenAI-compatible key in the browser. In hybrid mode, set OPENAI_API_KEY on apps/ai-service.";
  }

  if (message === "RAG_PROVIDER_CREDENTIALS_MISSING") {
    return "Missing embedding or Pinecone credentials. In BYOK mode, connect your own OpenAI-compatible embedding key and Pinecone key in the browser. In hybrid mode, set them on apps/ai-service.";
  }

  if (message === "AI_PROVIDER_REQUEST_FAILED") {
    return "The model provider request failed. Check provider credentials, quota, and outbound network access.";
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
