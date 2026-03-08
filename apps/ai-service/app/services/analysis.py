from __future__ import annotations

import base64
import json
from urllib.request import Request, urlopen

from app.schemas import AnalyzeRequest


def _detect_sentiment(comments: list[str]) -> str:
    if not comments:
        return "neutral"

    positive_terms = ["good", "helpful", "great", "love", "useful"]
    negative_terms = ["bad", "boring", "confusing", "slow"]

    text = " ".join(comments).lower()
    positive_hits = sum(1 for term in positive_terms if term in text)
    negative_hits = sum(1 for term in negative_terms if term in text)

    if positive_hits > negative_hits + 1:
        return "positive"
    if negative_hits > positive_hits + 1:
        return "negative"
    if positive_hits == 0 and negative_hits == 0:
        return "neutral"
    return "mixed"


def build_analysis_payload(data: AnalyzeRequest) -> dict:
    title_len = len(data.metadata.title)
    transcript_hint = (data.captions_text or "").strip()

    hook_analysis = (
        "Title is dense; move outcome promise earlier and remove extra modifiers."
        if title_len > 58
        else "Title density is healthy with a clear payoff promise for first-screen attention."
    )

    thumbnail_score = 84 if data.metadata.stats.view_count > 1_000_000 else 72

    return {
        "structure": {
            "hook_analysis": (
                f"{hook_analysis} Transcript is available, so hook and pacing can be checked against spoken delivery."
                if transcript_hint
                else hook_analysis
            ),
            "pacing_notes": [
                "Show final outcome in first 12 seconds before any long setup.",
                "Add one failure example in the 35%-55% segment.",
                (
                    "Use the transcript to verify whether the spoken payoff lands before the first setup block."
                    if transcript_hint
                    else "Tie CTA to next video promise, not a generic subscribe prompt."
                ),
                "Tie CTA to next video promise, not a generic subscribe prompt."
            ],
            "cta_review": "CTA is acceptable but should include one concrete next action and payoff."
        },
        "thumbnail_review": {
            "score": thumbnail_score,
            "diagnosis": "Main subject reads clearly, but contrast hierarchy can be stronger.",
            "improvements": [
                "Keep overlay text to 3-4 words.",
                "Increase foreground/background contrast.",
                "Use one dominant conflict element only."
            ]
        },
        "comments_insights": {
            "sentiment": _detect_sentiment(data.comments),
            "audience_persona": "Growth-focused creators looking for reusable script systems.",
            "motivations": [
                "Copy proven script structure",
                "Improve thumbnail CTR",
                "Reduce trial-and-error"
            ],
            "concerns": [
                "Needs more case examples",
                "Needs more quant proof",
                "Pacing may be too fast for some viewers"
            ]
        }
    }


def build_analysis_system_prompt() -> str:
    return """
You are a senior YouTube viral content strategist.
Return only valid JSON.

The JSON must exactly match this shape:
{
  "structure": {
    "hook_analysis": "string",
    "pacing_notes": ["string", "string", "string"],
    "cta_review": "string"
  },
  "thumbnail_review": {
    "score": 0,
    "diagnosis": "string",
    "improvements": ["string", "string", "string"]
  },
  "comments_insights": {
    "sentiment": "positive|neutral|mixed|negative",
    "audience_persona": "string",
    "motivations": ["string", "string", "string"],
    "concerns": ["string", "string"]
  }
}

Rules:
- Output in English.
- Be specific and actionable.
- Keep each bullet concise.
- If an image is provided, use the visual evidence from the thumbnail instead of guessing from the URL alone.
- Do not include markdown, code fences, or explanations outside JSON.
""".strip()


def build_analysis_user_prompt(data: AnalyzeRequest) -> str:
    captions_preview = (data.captions_text or "").strip()
    if captions_preview:
        captions_preview = captions_preview[:4000]

    payload = {
        "metadata": data.metadata.model_dump(mode="json"),
        "comments": data.comments,
        "thumbnail_url": str(data.thumbnail_url),
        "captions_text": captions_preview or None,
    }
    return json.dumps(payload, ensure_ascii=False)


def fetch_thumbnail_data_url(url: str) -> str | None:
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
        },
    )

    try:
        with urlopen(request, timeout=12) as response:
            content_type = response.headers.get_content_type()
            if not content_type.startswith("image/"):
                return None

            binary = response.read(900_000)
            encoded = base64.b64encode(binary).decode("ascii")
            return f"data:{content_type};base64,{encoded}"
    except Exception:
        return None


def build_analysis_user_content(data: AnalyzeRequest) -> list[dict]:
    text_payload = build_analysis_user_prompt(data)
    thumbnail_data_url = fetch_thumbnail_data_url(str(data.thumbnail_url))

    content: list[dict] = [{"type": "text", "text": text_payload}]

    if thumbnail_data_url:
        content.append({"type": "image_url", "image_url": {"url": thumbnail_data_url}})

    return content
