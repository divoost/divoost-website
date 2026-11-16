// AI 모델 카탈로그 (백엔드 마스터)
// 원가는 회사가 프로바이더에 지불하는 비용 (cent 단위, USD)
// 판매가는 고객에게 차감하는 크레딧 (cent 단위) - 원가 × 마진 배수

export interface ModelConfig {
  provider: "replicate" | "fal" | "openai" | "openai-chat";
  modelId?: string;
  costPerUnitCents: number;  // 원가 (이미지 = 장당, 영상 = 초당, 텍스트 = 1회당)
  chargedPerUnitCents: number; // 판매가
  defaultDuration?: number;  // 영상 기본 초
  unitType: "per_image" | "per_second" | "per_clip" | "per_call";
  premium?: boolean;  // premium 플랜만 사용 가능
  buildInput(prompt: string, opts: any): any;
  extractOutput(data: any): string;
}

// 마진 배수 (원가 대비)
const MARGIN = 1.7;

function applyMargin(costCents: number): number {
  return Math.ceil(costCents * MARGIN);
}

// ── 화면비 변환 ──
function aspectToFlux(a: string): string {
  const map: Record<string, string> = { "1:1": "1:1", "9:16": "9:16", "16:9": "16:9", "4:5": "4:5" };
  return map[a] || "1:1";
}
function aspectToIdeogram(a: string): string {
  const map: Record<string, string> = { "1:1": "ASPECT_1_1", "9:16": "ASPECT_9_16", "16:9": "ASPECT_16_9", "4:5": "ASPECT_4_5" };
  return map[a] || "ASPECT_1_1";
}
function aspectToSDXL(a: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "9:16": { width: 768, height: 1344 },
    "16:9": { width: 1344, height: 768 },
    "4:5": { width: 896, height: 1152 },
  };
  return map[a] || map["1:1"];
}
function aspectToDallE(a: string): string {
  const map: Record<string, string> = { "1:1": "1024x1024", "9:16": "1024x1792", "16:9": "1792x1024" };
  return map[a] || "1024x1024";
}

// ── 이미지 모델 ──
export const IMAGE_MODELS: Record<string, ModelConfig> = {
  "flux-1.1-pro": {
    provider: "replicate",
    modelId: "black-forest-labs/flux-1.1-pro",
    costPerUnitCents: 4,
    chargedPerUnitCents: applyMargin(4),
    unitType: "per_image",
    buildInput: (prompt, opts) => ({ prompt, aspect_ratio: aspectToFlux(opts.aspect), output_format: "jpg", safety_tolerance: 2 }),
    extractOutput: (d) => typeof d === "string" ? d : Array.isArray(d) ? d[0] : d?.url,
  },
  "flux-schnell": {
    provider: "replicate",
    modelId: "black-forest-labs/flux-schnell",
    costPerUnitCents: 1,  // 실제 ~0.3센트지만 최소 1센트로 잡음
    chargedPerUnitCents: 2,
    unitType: "per_image",
    buildInput: (prompt, opts) => ({ prompt, aspect_ratio: aspectToFlux(opts.aspect), num_outputs: 1, output_format: "jpg" }),
    extractOutput: (d) => Array.isArray(d) ? d[0] : d,
  },
  "ideogram-v2": {
    provider: "replicate",
    modelId: "ideogram-ai/ideogram-v2",
    costPerUnitCents: 8,
    chargedPerUnitCents: applyMargin(8),
    unitType: "per_image",
    buildInput: (prompt, opts) => ({ prompt, aspect_ratio: aspectToIdeogram(opts.aspect), magic_prompt_option: "On" }),
    extractOutput: (d) => Array.isArray(d) ? d[0] : d,
    premium: true,
  },
  "sdxl": {
    provider: "replicate",
    modelId: "stability-ai/sdxl",
    costPerUnitCents: 1,
    chargedPerUnitCents: 2,
    unitType: "per_image",
    buildInput: (prompt, opts) => ({ prompt, ...aspectToSDXL(opts.aspect) }),
    extractOutput: (d) => Array.isArray(d) ? d[0] : d,
  },
  "dall-e-3": {
    provider: "openai",
    costPerUnitCents: 4,
    chargedPerUnitCents: applyMargin(4),
    unitType: "per_image",
    buildInput: (prompt, opts) => ({ model: "dall-e-3", prompt, size: aspectToDallE(opts.aspect), quality: "standard", n: 1 }),
    extractOutput: (d) => d?.data?.[0]?.url,
    premium: true,
  },
};

// ── 영상 모델 ──
export const VIDEO_MODELS: Record<string, ModelConfig> = {
  "pika-2.0": {
    provider: "replicate",
    modelId: "pikalabsai/pika-2.0",
    costPerUnitCents: 6,  // 초당 ~6센트
    chargedPerUnitCents: applyMargin(6),
    defaultDuration: 5,
    unitType: "per_second",
    buildInput: (prompt, opts) => ({ prompt, aspect_ratio: aspectToFlux(opts.aspect), duration: opts.duration || 5 }),
    extractOutput: (d) => typeof d === "string" ? d : d?.url || (Array.isArray(d) ? d[0] : ""),
  },
  "luma-dream": {
    provider: "replicate",
    modelId: "luma/dream-machine",
    costPerUnitCents: 7,
    chargedPerUnitCents: applyMargin(7),
    defaultDuration: 5,
    unitType: "per_second",
    buildInput: (prompt, opts) => ({ prompt, aspect_ratio: aspectToFlux(opts.aspect) }),
    extractOutput: (d) => typeof d === "string" ? d : d?.url,
  },
  "kling-2": {
    provider: "replicate",
    modelId: "kwaivgi/kling-v2.0",
    costPerUnitCents: 4,
    chargedPerUnitCents: applyMargin(4),
    defaultDuration: 5,
    unitType: "per_second",
    buildInput: (prompt, opts) => ({ prompt, aspect_ratio: aspectToFlux(opts.aspect), duration: opts.duration || 5 }),
    extractOutput: (d) => typeof d === "string" ? d : d?.url,
  },
  "hailuo": {
    provider: "replicate",
    modelId: "minimax/hailuo-02",
    costPerUnitCents: 5,
    chargedPerUnitCents: applyMargin(5),
    defaultDuration: 6,
    unitType: "per_second",
    buildInput: (prompt) => ({ prompt, duration: 6 }),
    extractOutput: (d) => typeof d === "string" ? d : d?.url,
  },
  "runway-gen3": {
    provider: "replicate",
    modelId: "runwayml/gen-3-alpha",
    costPerUnitCents: 10,
    chargedPerUnitCents: applyMargin(10),
    defaultDuration: 5,
    unitType: "per_second",
    buildInput: (prompt, opts) => ({ prompt, duration: opts.duration || 5, aspect_ratio: aspectToFlux(opts.aspect) }),
    extractOutput: (d) => typeof d === "string" ? d : d?.url,
    premium: true,
  },
};

// ── 텍스트 모델 ──
// 플랫폼/톤/길이 옵션으로 SNS 캡션·블로그 글 생성. 1회 호출당 정액 과금(토큰 미터링 아님).
const TEXT_LENGTH: Record<string, { maxTokens: number; guide: string }> = {
  short:  { maxTokens: 220,  guide: "2~3문장의 짧은 캡션" },
  medium: { maxTokens: 600,  guide: "4~6문장 분량의 본문" },
  long:   { maxTokens: 1200, guide: "여러 문단의 상세한 글" },
};
// 해시태그는 앱의 별도 섹션에서 생성하므로 본문에는 넣지 않도록 지시
const TEXT_PLATFORM_HINT: Record<string, string> = {
  instagram:   "인스타그램 피드 톤, 줄바꿈과 이모지를 적절히 사용",
  tiktok:      "짧고 강한 후킹 문장, 트렌디한 말투",
  xiaohongshu: "샤오홍수(小红书) 노트 스타일, 친근한 리뷰체, 이모지 사용",
  facebook:    "페이스북 페이지 톤, 정보 전달 + 공감",
  blog:        "네이버 블로그 포스팅 톤, 소제목 포함, 자연스러운 정보성 글",
};
const TEXT_TONE_HINT: Record<string, string> = {
  friendly:     "친근하고 다정한 말투",
  professional: "전문적이고 신뢰감 있는 말투",
  emotional:    "감성적이고 공감되는 말투",
  humorous:     "유머러스하고 재치있는 말투",
};

function buildTextMessages(prompt: string, opts: any): Array<{ role: string; content: string }> {
  const len = TEXT_LENGTH[opts?.length as string] || TEXT_LENGTH.medium;
  const platform = TEXT_PLATFORM_HINT[opts?.platform as string] || "";
  const tone = TEXT_TONE_HINT[opts?.tone as string] || TEXT_TONE_HINT.friendly;
  const langMap: Record<string, string> = { en: "영어로", vi: "베트남어로", zh: "중국어로", ko: "한국어로" };
  const lang = langMap[opts?.language as string] || "한국어로";
  const sys =
    "너는 SNS 마케팅 카피라이터다. 주어진 주제로 바로 게시 가능한 완성된 글만 출력한다. " +
    "설명이나 머리말, 해시태그 없이 본문만 작성한다. " +
    lang + " 작성하고, " + tone + "을 사용한다. " +
    (platform ? platform + ". " : "") + len.guide + "으로 작성한다.";
  return [
    { role: "system", content: sys },
    { role: "user", content: String(prompt).slice(0, 2000) },
  ];
}

export const TEXT_MODELS: Record<string, ModelConfig> = {
  "gpt-4o-mini": {
    provider: "openai-chat",
    modelId: "gpt-4o-mini",
    costPerUnitCents: 1,
    chargedPerUnitCents: 2,
    unitType: "per_call",
    buildInput: (prompt, opts) => ({
      model: "gpt-4o-mini",
      messages: buildTextMessages(prompt, opts),
      max_tokens: (TEXT_LENGTH[opts?.length as string] || TEXT_LENGTH.medium).maxTokens,
      temperature: 0.85,
    }),
    extractOutput: (d) => (typeof d === "string" ? d : d?.text || ""),
  },
  "gpt-4o": {
    provider: "openai-chat",
    modelId: "gpt-4o",
    costPerUnitCents: 3,
    chargedPerUnitCents: applyMargin(3),
    unitType: "per_call",
    premium: true,
    buildInput: (prompt, opts) => ({
      model: "gpt-4o",
      messages: buildTextMessages(prompt, opts),
      max_tokens: (TEXT_LENGTH[opts?.length as string] || TEXT_LENGTH.medium).maxTokens,
      temperature: 0.85,
    }),
    extractOutput: (d) => (typeof d === "string" ? d : d?.text || ""),
  },
};

type GenType = "image" | "video" | "text";
function modelOf(type: GenType, key: string): ModelConfig | undefined {
  if (type === "image") return IMAGE_MODELS[key];
  if (type === "video") return VIDEO_MODELS[key];
  return TEXT_MODELS[key];
}

export function calcChargeCents(type: GenType, modelKey: string, duration?: number): number {
  const m = modelOf(type, modelKey);
  if (!m) return 0;
  if (m.unitType === "per_second") return m.chargedPerUnitCents * (duration || m.defaultDuration || 5);
  return m.chargedPerUnitCents;
}

export function calcCostCents(type: GenType, modelKey: string, duration?: number): number {
  const m = modelOf(type, modelKey);
  if (!m) return 0;
  if (m.unitType === "per_second") return m.costPerUnitCents * (duration || m.defaultDuration || 5);
  return m.costPerUnitCents;
}
