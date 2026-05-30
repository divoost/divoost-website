# AI 이미지/영상 생성 게이트웨이 설정 가이드

DIVOOST SNS Platform은 **Replicate / Fal.ai / OpenAI** 멀티 프로바이더 게이트웨이로 AI 이미지 및 영상을 생성합니다.

## 🎯 추천 조합

| 우선순위 | 프로바이더 | 이유 |
|---|---|---|
| ⭐ 1순위 | **Replicate** | 1000+ 모델, 페이 퍼 유즈, 가장 다양 |
| 2순위 | **Fal.ai** | 빠른 응답 속도, Flux 특화 |
| 3순위 | **OpenAI** | DALL-E 3, GPT-4 텍스트 동시 사용 시 |

**1개만 등록해도 작동합니다.** Replicate 하나면 거의 모든 모델 사용 가능.

---

## 1) Replicate API Key 발급 (필수 추천)

1. https://replicate.com 회원가입
2. https://replicate.com/account/api-tokens 이동
3. **Create token** 클릭
4. 이름: `divoost-sns` 입력 → Create
5. `r8_xxxxxxx...` 형태 토큰 복사
6. 결제 등록: https://replicate.com/account/billing
   - 신용카드 등록 필요 (사용한 만큼 후불)
   - 무료 크레딧 일부 제공

### 비용 예시 (2026.5 기준)
| 모델 | 1회 비용 |
|---|---|
| Flux Schnell (이미지) | ~$0.003 |
| Flux 1.1 Pro (이미지) | ~$0.04 |
| Ideogram v2 (이미지) | ~$0.08 |
| Pika 2.0 (5초 영상) | ~$0.30 |
| Kling 2.0 (5초 영상) | ~$0.20 |
| Runway Gen-3 (5초) | ~$0.50 |
| Hailuo (6초) | ~$0.30 |

---

## 2) Fal.ai API Key 발급 (선택)

1. https://fal.ai 회원가입
2. https://fal.ai/dashboard/keys 이동
3. **Create new key** 클릭
4. 키 복사
5. 결제 등록 (마찬가지로 페이 퍼 유즈)

Fal.ai는 **2-3배 빠른 응답** (Replicate의 cold start 회피)이 장점.

---

## 3) OpenAI API Key 발급 (텍스트 생성용 + DALL-E 3)

1. https://platform.openai.com/signup
2. https://platform.openai.com/api-keys → Create new secret key
3. 결제 등록: https://platform.openai.com/account/billing
4. `sk-proj-...` 형식 키 복사

---

## 4) 플랫폼 설정에 입력

1. DIVOOST SNS Platform → **설정 페이지**
2. **🤖 AI 이미지/영상 생성 설정** 섹션
3. 위에서 발급받은 키 입력:
   - **Replicate API Key**: `r8_...`
   - **Fal.ai API Key** (선택): `...`
   - **OpenAI API Key** (선택): `sk-...`
4. **기본 이미지 모델**: 권장 `Flux Schnell` (가성비) 또는 `Flux 1.1 Pro` (품질)
5. **기본 영상 모델**: 권장 `Pika 2.0` 또는 `Kling 2.0`
6. **기본 화면비**:
   - Instagram Feed: `4:5` 또는 `1:1`
   - Reels/Stories/TikTok: `9:16`
   - YouTube: `16:9`
7. **월 예산 알림**: 비용 한도 설정
8. **💾 전체 저장** 클릭

---

## 5) 사용 방법

### 콘텐츠 만들기 페이지에서

1. `콘텐츠 만들기` → 아래 **🎨 AI 이미지/영상 생성** 섹션
2. 프롬프트 입력 (영어 권장)
3. 유형/모델/화면비 선택
4. **✨ 생성하기** 클릭
5. 미리보기 확인 → **✅ 이 미디어 사용** 클릭
6. 생성된 미디어 URL이 본문에 자동 첨부됨
7. 발행 시 함께 게시

### 프롬프트 작성 팁

**좋은 프롬프트**:
```
Professional product photography of a Cocokrew skincare bottle,
soft natural lighting, minimalist white background,
high quality, clean composition, lifestyle aesthetic
```

**나쁜 프롬프트**:
```
화장품 사진
```

### 한국어 자동 영문화

내장 함수 `SNSAI.buildSnsPrompt()` 사용:
- 플랫폼별 스타일 자동 추가
- 화면비 힌트 자동 삽입

---

## 6) 자동 저장

생성된 미디어는 **자동으로 Supabase Storage** (`sns-media` 버킷)에 저장됩니다.

- Instagram/TikTok 등 발행 시 그대로 사용 가능
- 원본 Replicate/Fal URL은 임시 (24시간~7일 후 만료) → Supabase 영구 저장 필요

---

## 7) 보안 주의사항

⚠️ **API 키는 브라우저 localStorage에 저장됩니다**. 다음 사항 권고:
- 공용 PC에서 사용 금지
- 사용 후 로그아웃 시 키 삭제 옵션 활용
- 월 예산 알림 설정으로 비용 폭주 방지
- API 키는 Replicate/Fal/OpenAI 대시보드에서 언제든 회전 가능

장기적으로 백엔드 프록시 도입 예정 (현재는 클라이언트 직접 호출).

---

## 8) 자주 발생하는 오류

| 오류 | 원인 | 해결 |
|---|---|---|
| "API Key가 설정되지 않았습니다" | 설정 미저장 | 설정 → 키 입력 → 💾 저장 |
| `401 Unauthorized` | 잘못된/만료된 키 | 새 키 발급 후 재입력 |
| `402 Payment Required` | 결제 등록 안 됨 | Replicate/Fal에서 카드 등록 |
| `생성 시간 초과` | 모델 cold start | 다시 시도 (보통 두 번째는 성공) |
| `Output 형식 오류` | 모델 응답 변경 | GitHub Issue 등록 |

---

## 9) 지원 모델 일람

### 이미지
- `flux-1.1-pro` - 최고 품질
- `flux-schnell` - 빠르고 저렴
- `ideogram-v2` - 텍스트가 정확
- `sdxl` - 가장 저렴
- `dall-e-3` - OpenAI 직접
- `flux-pro-fal` - Fal.ai 경유 Flux

### 영상
- `pika-2.0` - 표준
- `luma-dream` - 자연스러운 움직임
- `kling-2` - 가성비
- `hailuo` - Minimax (6초)
- `runway-gen3` - 최고 품질
- `pika-fal` - Fal.ai 경유 Pika

새 모델은 `js/ai-gateway.js`의 `IMAGE_MODELS`/`VIDEO_MODELS`에 추가만 하면 즉시 사용 가능합니다.
