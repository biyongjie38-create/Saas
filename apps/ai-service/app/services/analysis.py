from __future__ import annotations

import json

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

    hook_analysis = (
        "Title is dense; move outcome promise earlier and remove extra modifiers."
        if title_len > 58
        else "Title density is healthy with a clear payoff promise for first-screen attention."
    )

    thumbnail_score = 84 if data.metadata.stats.view_count > 1_000_000 else 72

    return {
        "structure": {
            "hook_analysis": hook_analysis,
            "pacing_notes": [
                "Show final outcome in first 12 seconds before any long setup.",
                "Add one failure example in the 35%-55% segment.",
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
- Do not include markdown, code fences, or explanations outside JSON.
""".strip()


def build_analysis_user_prompt(data: AnalyzeRequest) -> str:
    payload = {
        "metadata": data.metadata.model_dump(mode="json"),
        "comments": data.comments,
        "thumbnail_url": str(data.thumbnail_url),
    }
    return json.dumps(payload, ensure_ascii=False)
