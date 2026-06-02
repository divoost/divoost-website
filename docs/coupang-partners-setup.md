# 쿠팡 파트너스 API 연동 설정 가이드

> 마스터님이 진행해야 할 Supabase 배포 단계 안내.
> 코드(Edge Function + 대시보드 페이지)는 이미 작업 완료됨.

## 보안 원칙
- **Access Key / Secret Key는 절대 클라이언트(브라우저)에 노출 X**
- 모든 호출은 Supabase Edge Function `coupang-partners`를 경유
- Edge Function이 서버에서 HMAC SHA256 서명 생성 후 쿠팡 API 호출
- 로그인된 사용자(JWT)만 호출 가능

## 마스터 작업 (3단계, 약 10분)

### 1) Supabase에 시크릿 등록

Supabase 프로젝트 대시보드에서:
- **Project Settings → Edge Functions → Manage secrets**
- 또는 CLI:
  ```bash
  supabase secrets set COUPANG_ACCESS_KEY=실제_액세스_키
  supabase secrets set COUPANG_SECRET_KEY=실제_시크릿_키
  ```

### 2) Edge Function 배포

로컬에서 (Supabase CLI 설치되어 있어야 함):
```bash
cd /home/user/divoost-website
supabase functions deploy coupang-partners
```

대시보드 GUI로 하려면:
- **Edge Functions → Deploy a new function**
- `supabase/functions/coupang-partners/index.ts` 파일 업로드

### 3) (선택) API 사용 로그 테이블

호출 로그를 Supabase에 저장하고 싶다면:
```sql
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: 본인 로그만 조회
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_logs" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);
```

테이블이 없어도 Edge Function은 동작합니다 (insert 실패는 무시).

## 테스트

1. https://hubontrade.com/sns-platform/auth.html 에서 로그인
2. https://hubontrade.com/dashboard/coupang-partners.html 접속
3. 상단 우측 "키 정상" 배지 확인
4. 검색 탭 → "에어팟" 입력 → 검색 → 결과 표시

## 지원 기능 (이미 구현됨)

| 탭 | 기능 | 엔드포인트 |
|---|---|---|
| 상품 검색 | 키워드 검색 (1분당 50회) | GET /products/search |
| 베스트 카테고리 | 카테고리별 베스트 16개 | GET /products/bestcategories/{id} |
| 골드박스 | 오늘의 골드박스 | GET /products/goldbox |
| 딥링크 생성 | 쿠팡 URL → 파트너스 단축 URL | POST /deeplink |
| 리포트 조회 | 클릭/주문/취소/수익 (시간당 500회) | GET /reports/{type} |

## 트러블슈팅

| 에러 | 원인 | 해결 |
|---|---|---|
| `Coupang API keys not configured` | 시크릿 미등록 | 1단계 다시 실행 |
| `Invalid signature` | Secret Key 잘못 입력 | 시크릿 재확인 |
| `Request is not authorized` | Access Key 잘못 입력 | 시크릿 재확인 |
| `Specified signature is expired` | 서버 시간 동기화 문제 (드뭄) | Supabase 측 자동 처리, 재시도 |
| `Unauthorized: invalid token` | 로그인 세션 만료 | 다시 로그인 |

## 코드 위치
- Edge Function: `supabase/functions/coupang-partners/index.ts`
- 대시보드 UI: `dashboard/coupang-partners.html`
- 대시보드 사이드바 링크: `dashboard/index.html` (관리 섹션)
