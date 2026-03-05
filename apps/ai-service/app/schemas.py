from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class Stats(BaseModel):
    view_count: int = Field(ge=0)
    like_count: int = Field(ge=0)
    comment_count: int = Field(ge=0)


class Metadata(BaseModel):
    video_id: str
    title: str
    description: str = ""
    channel_name: str
    published_at: str
    duration_sec: int = Field(gt=0)
    stats: Stats


class AnalyzeRequest(BaseModel):
    metadata: Metadata
    comments: list[str] = Field(default_factory=list)
    thumbnail_url: HttpUrl


class StructureAnalysis(BaseModel):
    hook_analysis: str
    pacing_notes: list[str]
    cta_review: str


class ThumbnailReview(BaseModel):
    score: int = Field(ge=0, le=100)
    diagnosis: str
    improvements: list[str]


class CommentsInsights(BaseModel):
    sentiment: Literal["positive", "neutral", "mixed", "negative"]
    audience_persona: str
    motivations: list[str]
    concerns: list[str]


class AnalysisPayload(BaseModel):
    structure: StructureAnalysis
    thumbnail_review: ThumbnailReview
    comments_insights: CommentsInsights


class AnalyzeResponse(BaseModel):
    analysis: AnalysisPayload
    model: str
    retries: int
    latency_ms: int


class RagCompareRequest(BaseModel):
    video_id: str
    structure_summary: str
    topic_hint: str = ""
    top_k: int = Field(default=3, ge=1, le=5)


class BenchmarkItem(BaseModel):
    id: str
    title: str
    source_url: HttpUrl
    similarity: int = Field(ge=0, le=100)
    shared_points: list[str]
    differences: list[str]
    copy: list[str]
    avoid: list[str]


class BenchmarksPayload(BaseModel):
    top_matches: list[BenchmarkItem]


class RagCompareResponse(BaseModel):
    benchmarks: BenchmarksPayload
    model: str
    retries: int
    latency_ms: int


class ScoreBreakdown(BaseModel):
    title: int = Field(ge=0, le=100)
    thumbnail: int = Field(ge=0, le=100)
    hook: int = Field(ge=0, le=100)
    pacing: int = Field(ge=0, le=100)
    value_density: int = Field(ge=0, le=100)
    emotion_resonance: int = Field(ge=0, le=100)


class ScorePayload(BaseModel):
    total: int = Field(ge=0, le=100)
    breakdown: ScoreBreakdown
    top_actions: list[str]


class ScoreRequest(BaseModel):
    metadata: Metadata
    analysis: AnalysisPayload
    benchmarks: BenchmarksPayload | None = None


class ScoreResponse(BaseModel):
    score: ScorePayload
    model: str
    retries: int
    latency_ms: int
