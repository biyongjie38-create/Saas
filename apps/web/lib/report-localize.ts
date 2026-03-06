import type { Lang } from "@/lib/i18n-shared";
import type { AnalysisJson, ScoreJson, VideoDataSource } from "@/lib/types";

const zhTextMap: Record<string, string> = {
  "Title has high information density. Move the outcome promise earlier and reduce extra wording.": "标题信息密度偏高，建议把结果承诺前置并减少冗余表述。",
  "Title length is healthy and the value promise is clear for first-screen attention.": "标题长度合理，价值承诺清晰，能抓住首屏注意力。",
  "Show the final outcome within 0-15 seconds before background context.": "先在 0-15 秒内展示最终结果，再补充背景上下文。",
  "Add one contrastive case around 35% runtime to improve retention.": "在视频约 35% 处加入一个对比案例，提升留存。",
  "Tie CTA to the next specific video topic instead of generic subscription ask.": "把 CTA 绑定到下一个具体选题，不要只做泛化订阅引导。",
  "CTA is actionable but should include one concrete next action and expected payoff.": "CTA 具备可执行性，但还应加入一个明确的下一步动作和预期收益。",
  "Main subject is clear, but contrast hierarchy and text layering can be improved.": "主体清晰，但对比层次和文字排布还有优化空间。",
  "Keep overlay text under 4 words and start with action verbs.": "封面叠字控制在 4 个词以内，并优先使用动作动词开头。",
  "Increase brightness contrast between face/object and background.": "提升人物/主体与背景之间的亮度对比。",
  "Use before/after visual contrast to increase click intent.": "使用前后对比的视觉结构，提升点击意图。",
  "Growth-focused creators looking for reusable scripts and repeatable workflows.": "以增长为目标的创作者，关注可复用脚本与可复制流程。",
  "Reuse proven script patterns": "复用已验证的脚本结构",
  "Increase thumbnail CTR": "提升封面点击率（CTR）",
  "Reduce creative trial-and-error": "减少内容创作中的试错成本",
  "Not enough cases": "案例数量不够",
  "Need more measurable advanced detail": "需要更多可量化的进阶细节",
  "Show final outcome footage in first 10 seconds.": "前 10 秒先展示最终结果画面。",
  "Reduce thumbnail words to 3-4 and highlight conflict keyword.": "将封面文字压缩到 3-4 个词，并突出冲突关键词。",
  "Insert one failure case around 40% timeline to boost value density.": "在约 40% 时间点插入一个失败案例，提高信息密度。",
  "Rewrite CTA with clear promise for the next video.": "重写 CTA，明确下一条视频的具体收益承诺。",
  "Live API": "实时 API",
  "Mock Demo": "演示数据",
  "Mock Synthetic": "合成数据"
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
      audiencePersona: localizeText(lang, value.commentsInsights.audiencePersona),
      motivations: value.commentsInsights.motivations.map((item) => localizeText(lang, item)),
      concerns: value.commentsInsights.concerns.map((item) => localizeText(lang, item))
    }
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
