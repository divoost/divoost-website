# 마켓플레이스 크롤러 (Gmarket + 네이버) 배포 가이드

> Edge Function `marketplace-crawler` 배포 안내. 쿠팡과 동일한 흐름.

## 1) Edge Function 배포

Supabase 대시보드:
```
https://supabase.com/dashboard/project/unruyezigyybnuvgdgdt/functions
```

→ **"Deploy a new function" → "Via Editor"**

- **Function name**: `marketplace-crawler` (정확히)
- 코드: 아래 raw URL 내용 전체 복사 → 붙여넣기
  ```
  https://raw.githubusercontent.com/divoost/divoost-website/main/supabase/functions/marketplace-crawler/index.ts
  ```
- **Deploy** 클릭

⚠ 쿠팡 함수가 `swift-function` slug로 저장된 것처럼 이 함수도 자동 이름이 다를 수 있음. 배포 후 실제 slug 확인하고 알려주시면 대시보드 호출 코드 맞춰드림.

## 2) JWT 토글 OFF

Settings 탭 → **"Verify JWT with legacy secret"** → OFF → Save

(쿠팡과 동일)

## 3) Secrets

이 함수는 추가 시크릿 불필요 (Gmarket/네이버는 공개 페이지 크롤링).

## 4) 테스트

```
hubontrade.com/dashboard/index.html
```

→ "키즈클라이밍" 입력 → "🤖 AI 검색"

기대 결과:
- 🚀 쿠팡: 10~16개 (API)
- 🟢 지마켓: N개 (크롤링)
- 🟩 네이버: N개 (크롤링)
- 나머지 8개: "개발 필요" 라벨

## 알려진 제약

### Gmarket / 네이버 크롤링
- 동적 JavaScript 렌더링 페이지는 일부 파싱 누락 가능
- 사이트가 HTML 구조 변경 시 파서 업데이트 필요
- 차단(Rate limit) 시 잠시 대기 후 재시도
- 검색 결과 페이지의 카드 개수에 의존 (보통 40~50개)

### 트러블슈팅
- `Gmarket fetch failed: 403` → User-Agent 차단. 함수 코드의 UA 문자열 업데이트
- `count: 0` → 사이트 HTML 구조 변경. 파서 정규식 업데이트
- 429 Too Many Requests → 호출 간격 조정 (debounce 추가)
