from __future__ import annotations

from app.schemas import ScoreRequest


def _bound(score: int) -> int:
    return max(0, min(100, score))


def build_score_payload(data: ScoreRequest) -> dict:
    stats = data.metadata.stats
    title_len = len(data.metadata.title)

    interaction_rate = (stats.like_count + stats.comment_count * 4) / max(1, stats.view_count)
    hook = _bound(58 + int(interaction_rate * 1400))
    title = _bound(54 + int(title_len / 2))
    thumbnail = data.analysis.thumbnail_review.score
    pacing = 72
    value_density = _bound(62 + int(interaction_rate * 1200))
    emotion = 67 if data.analysis.comments_insights.sentiment in {"mixed", "positive"} else 59

    total = round(
        title * 0.16
        + thumbnail * 0.18
        + hook * 0.2
        + pacing * 0.14
        + value_density * 0.18
        + emotion * 0.14
    )

    actions = [
        "Show a quantified outcome in the first 10 seconds.",
        "Reduce thumbnail text and highlight one conflict phrase.",
        "Insert one failure case in the middle for credibility."
    ]

    if data.benchmarks and data.benchmarks.top_matches:
        actions.append("Borrow rhythm from Top1 benchmark and move CTA 20-30 seconds earlier.")

    return {
        "total": _bound(total),
        "breakdown": {
            "title": title,
            "thumbnail": thumbnail,
            "hook": hook,
            "pacing": pacing,
            "value_density": value_density,
            "emotion_resonance": emotion
        },
        "top_actions": actions[:5]
    }
