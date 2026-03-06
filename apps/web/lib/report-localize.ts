import type { Lang } from "@/lib/i18n-shared";
import type { AnalysisJson, BenchmarksJson, ScoreJson, VideoDataSource } from "@/lib/types";

const zhTextMap: Record<string, string> = {
  "Title has high information density. Move the outcome promise earlier and reduce extra wording.":
    "标题信息密度偏高，建议把结果承诺前置，并减少多余表述。",
  "Title length is healthy and the value promise is clear for first-screen attention.":
    "标题长度合理，价值承诺清晰，能抓住首屏注意力。",
  "Show the final outcome within 0-15 seconds before background context.":
    "先在 0-15 秒内展示最终结果，再补充背景上下文。",
  "Add one contrastive case around 35% runtime to improve retention.":
    "在视频约 35% 位置加入一个对比案例，以提升留存。",
  "Tie CTA to the next specific video topic instead of generic subscription ask.":
    "把 CTA 绑定到下一个具体选题，而不是泛化地引导订阅。",
  "CTA is actionable but should include one concrete next action and expected payoff.":
    "CTA 具备可执行性，但还应加入一个明确的下一步动作和预期收益。",
  "Main subject is clear, but contrast hierarchy and text layering can be improved.":
    "主体清晰，但对比层次和文字排布仍有优化空间。",
  "Keep overlay text under 4 words and start with action verbs.":
    "封面叠字控制在 4 个词以内，并优先使用动作动词开头。",
  "Increase brightness contrast between face/object and background.":
    "提升人物或主体与背景之间的亮度对比。",
  "Use before/after visual contrast to increase click intent.":
    "使用前后对比的视觉结构，提升点击意图。",
  "Growth-focused creators looking for reusable scripts and repeatable workflows.":
    "以增长为目标的创作者，关注可复用脚本与可复制流程。",
  "Reuse proven script patterns": "复用已经验证有效的脚本模式",
  "Increase thumbnail CTR": "提升封面点击率（CTR）",
  "Reduce creative trial-and-error": "减少内容创作中的试错成本",
  "Not enough cases": "案例数量还不够",
  "Need more measurable advanced detail": "需要更多可量化的进阶细节",
  "Show final outcome footage in first 10 seconds.": "前 10 秒先展示最终结果画面。",
  "Reduce thumbnail words to 3-4 and highlight conflict keyword.": "把封面文案压缩到 3-4 个词，并突出冲突关键词。",
  "Insert one failure case around 40% timeline to boost value density.": "在约 40% 的时间点插入一个失败案例，提升价值密度。",
  "Rewrite CTA with clear promise for the next video.": "重写 CTA，明确下一条视频的具体收益承诺。",
  "Live API": "实时 API",
  "Mock Demo": "演示数据",
  "Mock Synthetic": "合成数据",
  "Avoid generic intro context before the main payoff.": "避免在主要结果出现前铺垫过多泛化背景。",
  "Avoid long intro setup": "避免过长的开场铺垫",
  "Avoid late CTA placement": "避免把 CTA 放得过晚"
};

const sentimentMap: Record<string, string> = {
  positive: "积极",
  neutral: "中性",
  mixed: "混合",
  negative: "消极"
};

function isChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

export function localizeText(lang: Lang, value: string): string {
  if (lang !== "zh") {
    return value;
  }

  if (!value || isChinese(value)) {
    return value;
  }

  return zhTextMap[value] ?? value;
}

export function localizeSourceLabel(lang: Lang, source: VideoDataSource): string {
  const sourceLabel: Record<VideoDataSource, string> = {
    youtube_api: "Live API",
    mock_demo: "Mock Demo",
    mock_synthetic: "Mock Synthetic"
  };

  return localizeText(lang, sourceLabel[source] ?? source);
}

export function localizeSentiment(lang: Lang, sentiment: string): string {
  if (lang !== "zh") {
    return sentiment;
  }

  return sentimentMap[sentiment] ?? sentiment;
}

function localizeBenchmarkLine(lang: Lang, value: string): string {
  if (lang !== "zh") {
    return value;
  }

  if (value.startsWith("Relevant to topic cluster: ")) {
    return `相关主题簇：${value.slice("Relevant to topic cluster: ".length)}`;
  }
  if (value.startsWith("Retrieved with hook pattern: ")) {
    return `命中的钩子模式：${value.slice("Retrieved with hook pattern: ".length)}`;
  }
  if (value.startsWith("Benchmark duration bucket is ")) {
    const rest = value
      .slice("Benchmark duration bucket is ".length)
      .replace(", so pacing may differ from the current video.", "");
    return `对标案例的时长分段是 ${rest}，因此节奏可能与当前视频不同。`;
  }
  if (value.startsWith("Adapt the ") && value.endsWith(" opening pattern into the first 10-15 seconds.")) {
    const hook = value.slice("Adapt the ".length, -" opening pattern into the first 10-15 seconds.".length);
    return `把 ${hook} 的开场模式压缩进前 10-15 秒。`;
  }
  if (value.startsWith("Reuse the ") && value.endsWith(" framing from this benchmark while keeping your original promise specific.")) {
    const topic = value.slice(
      "Reuse the ".length,
      -" framing from this benchmark while keeping your original promise specific.".length
    );
    return `复用这个 ${topic} 主题的表达框架，同时保留你原本清晰具体的结果承诺。`;
  }
  if (value.startsWith("Avoid drifting away from the query focus: ")) {
    return `避免偏离当前 query 重点：${value.slice("Avoid drifting away from the query focus: ".length)}`;
  }
  if (value.startsWith("Topic alignment: ")) {
    return `主题对齐：${value.slice("Topic alignment: ".length)}`;
  }
  if (value.startsWith("Hook pattern overlap: ")) {
    return `钩子模式重合：${value.slice("Hook pattern overlap: ".length)}`;
  }
  if (value.startsWith("This benchmark sits in the ") && value.endsWith(" runtime bucket.")) {
    const bucket = value.slice("This benchmark sits in the ".length, -" runtime bucket.".length);
    return `这个对标案例位于 ${bucket} 时长分段。`;
  }
  if (value.startsWith("Borrow the ") && value.endsWith(" opening pattern.")) {
    const hook = value.slice("Borrow the ".length, -" opening pattern.".length);
    return `借用 ${hook} 的开场模式。`;
  }

  return localizeText(lang, value);
}

export function localizeAnalysisJson(lang: Lang, value: AnalysisJson | null): AnalysisJson | null {
  if (!value || lang !== "zh") {
    return value;
  }

  return {
    ...value,
    structure: {
      ...value.structure,
      hookAnalysis: localizeText(lang, value.structure.hookAnalysis),
      pacingNotes: value.structure.pacingNotes.map((item) => localizeText(lang, item)),
      ctaReview: localizeText(lang, value.structure.ctaReview)
    },
    thumbnailReview: {
      ...value.thumbnailReview,
      diagnosis: localizeText(lang, value.thumbnailReview.diagnosis),
      improvements: value.thumbnailReview.improvements.map((item) => localizeText(lang, item))
    },
    commentsInsights: {
      ...value.commentsInsights,
      sentiment: localizeSentiment(lang, value.commentsInsights.sentiment) as AnalysisJson["commentsInsights"]["sentiment"],
      audiencePersona: localizeText(lang, value.commentsInsights.audiencePersona),
      motivations: value.commentsInsights.motivations.map((item) => localizeText(lang, item)),
      concerns: value.commentsInsights.concerns.map((item) => localizeText(lang, item))
    }
  };
}

export function localizeBenchmarksJson(lang: Lang, value: BenchmarksJson | null): BenchmarksJson | null {
  if (!value || lang !== "zh") {
    return value;
  }

  return {
    topMatches: value.topMatches.map((item) => ({
      ...item,
      sharedPoints: item.sharedPoints.map((entry) => localizeBenchmarkLine(lang, entry)),
      differences: item.differences.map((entry) => localizeBenchmarkLine(lang, entry)),
      copy: item.copy.map((entry) => localizeBenchmarkLine(lang, entry)),
      avoid: item.avoid.map((entry) => localizeBenchmarkLine(lang, entry))
    }))
  };
}

export function localizeScoreJson(lang: Lang, value: ScoreJson | null): ScoreJson | null {
  if (!value || lang !== "zh") {
    return value;
  }

  return {
    ...value,
    topActions: value.topActions.map((item) => localizeText(lang, item))
  };
}
