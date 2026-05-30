// AI 모델 카탈로그 (백엔드 마스터)
// 원가는 회사가 프로바이더에 지불하는 비용 (cent 단위, USD)
// 판매가는 고객에게 차감하는 크레딧 (cent 단위) - 원가 × 마진 배수

export interface ModelConfig {
  provider: "replicate" | "fal" | "openai";
  modelId?: string;
  costPerUnitCents: number;  // 원가 (이미지 = 장당, 영상 = 초당)
  chargedPerUnitCents: number; // 판매가
  defaultDuration?: number;  // 영상 기본 초
  unitType: "per_image" | "per_second" | "per_clip";
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

export function calcChargeCents(type: "image" | "video", modelKey: string, duration?: number): number {
  const m = (type === "image" ? IMAGE_MODELS : VIDEO_MODELS)[modelKey];
  if (!m) return 0;
  if (m.unitType === "per_image" || m.unitType === "per_clip") return m.chargedPerUnitCents;
  return m.chargedPerUnitCents * (duration || m.defaultDuration || 5);
}

export function calcCostCents(type: "image" | "video", modelKey: string, duration?: number): number {
  const m = (type === "image" ? IMAGE_MODELS : VIDEO_MODELS)[modelKey];
  if (!m) return 0;
  if (m.unitType === "per_image" || m.unitType === "per_clip") return m.costPerUnitCents;
  return m.costPerUnitCents * (duration || m.defaultDuration || 5);
}
