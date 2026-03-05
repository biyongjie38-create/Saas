from __future__ import annotations

import json
from pathlib import Path

from app.schemas import RagCompareRequest

LIB_PATH = Path(__file__).resolve().parents[1] / "data" / "viral_library.json"


def _tokenize(text: str) -> set[str]:
    pieces = text.lower().replace("/", " ").replace("-", " ").split()
    return {piece.strip() for piece in pieces if piece.strip()}


def _similarity(left: str, right: str) -> int:
    a = _tokenize(left)
    b = _tokenize(right)

    if not a or not b:
        return 60

    overlap = len(a.intersection(b))
    score = int(60 + (overlap / max(len(a), 1)) * 40)
    return min(98, max(60, score))


def _load_library() -> list[dict]:
    if not LIB_PATH.exists():
        return []
    return json.loads(LIB_PATH.read_text(encoding="utf-8"))


def build_benchmark_payload(data: RagCompareRequest) -> dict:
    library = _load_library()

    ranked = sorted(
        library,
        key=lambda item: _similarity(
            f"{data.structure_summary} {data.topic_hint}",
            f"{item.get('title', '')} {item.get('summary', '')}"
        ),
        reverse=True
    )

    top_matches = []
    for item in ranked[: data.top_k]:
        similarity = _similarity(
            f"{data.structure_summary} {data.topic_hint}",
            f"{item.get('title', '')} {item.get('summary', '')}"
        )

        top_matches.append(
            {
                "id": item["id"],
                "title": item["title"],
                "source_url": item["source_url"],
                "similarity": similarity,
                "shared_points": [
                    "Both use outcome-first hook plus method breakdown",
                    "Both establish a clear tension quickly"
                ],
                "differences": [
                    "Benchmark video uses stronger conflict escalation in the middle section"
                ],
                "copy": [
                    "Add quantified outcome in first 8 seconds",
                    "Use before/after block in second segment"
                ],
                "avoid": ["Avoid long intro setup", "Avoid late CTA placement"]
            }
        )

    return {
        "top_matches": top_matches
    }
