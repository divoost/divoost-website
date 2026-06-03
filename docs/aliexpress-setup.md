# AliExpress Affiliate API 연동 가이드

> 코드는 준비 완료. 마스터가 API 키만 받으시면 됩니다.

## 1) AliExpress Portal 가입 (5분)

```
https://portals.aliexpress.com
```

→ "Join Now" (또는 한국어로 "지금 가입")
→ Alibaba 계정 로그인 (없으면 가입)
→ 기본 정보 입력 (회사명 HUBONTRADE)
→ 가입 완료

## 2) API Access 신청 (10분 ~ 1일 심사)

가입 후:
```
https://portals.aliexpress.com/api.htm
```

→ "Apply for API Access"
→ 사용 목적 작성 (예: "Cross-border e-commerce platform for Korean sellers, product search and price comparison")
→ 제출

심사 통과 후:
- **App Key**: 영문/숫자 (예: `12345678`)
- **App Secret**: 긴 문자열 (예: `abcDEF123XYZ...`)

## 3) Tracking ID 생성

Portal → "Account" → "Tracking IDs":
→ "Create Tracking ID"
→ Name: `hubontrade`
→ 생성된 ID 복사 (예: `mm_12345678`)

## 4) Supabase Secrets 등록

```
https://supabase.com/dashboard/project/unruyezigyybnuvgdgdt/functions/secrets
```

→ "Add new secret" 3개:

| Name | Value |
|---|---|
| `ALIEXPRESS_APP_KEY` | (2단계 App Key) |
| `ALIEXPRESS_APP_SECRET` | (2단계 App Secret) |
| `ALIEXPRESS_TRACKING_ID` | (3단계 Tracking ID) |

→ Save

## 5) Edge Function 배포

```
https://supabase.com/dashboard/project/unruyezigyybnuvgdgdt/functions
```

→ "Deploy a new function" → "Via Editor"
→ Function name: `aliexpress-partners`
→ 코드 가져오기:
```
https://raw.githubusercontent.com/divoost/divoost-website/main/supabase/functions/aliexpress-partners/index.ts
```
→ 코드 복사 → 붙여넣기 → Deploy

→ Settings 탭 → "Verify JWT with legacy secret" → OFF → Save

## 6) 배포 후 함수 slug 확인

쿠팡(`swift-function`)과 크롤러(`quick-handler`)처럼 자동 생성된 이름 확인.

slug 알려주시면 대시보드 호출 코드 추가하겠습니다.

## 7) 테스트 (대시보드 통합 후)

대시보드 → AI 검색 → 알리익스프레스 결과도 함께 표시됨

## API 한도

| 플랜 | 일 한도 | 가격 |
|---|---|---|
| Free | 5,000 호출 | 무료 |
| Pro | 50,000 호출 | 신청 |

대시보드 사용에는 무료 한도 충분.
