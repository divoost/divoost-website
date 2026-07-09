# 네이버 블로그/카페 OAuth + 글쓰기 API 연동 설정 가이드

DIVOOST SNS 플랫폼에 네이버 블로그·카페 자동 발행 기능을 활성화하는 단계별 안내입니다.

## 📋 사전 준비물

- 네이버 개인 계정 (블로그/카페 글쓰기 권한 보유)
- Supabase 프로젝트 (Edge Function 배포 권한)
- Supabase CLI 설치 (`npm i -g supabase`)

---

## 1️⃣ 네이버 개발자센터 애플리케이션 등록

1. **https://developers.naver.com/apps** 접속 → 네이버 계정으로 로그인
2. **"애플리케이션 등록"** 클릭
3. 앱 정보 입력:
   - **애플리케이션 이름**: `DIVOOST-SNS`
   - **사용 API**: 아래 3개를 모두 추가
     - **네이버 로그인** (필수 — OAuth 인증)
     - **블로그** (블로그 글쓰기)
     - **카페** (카페 글쓰기)
4. **로그인 오픈 API 서비스 환경**: PC웹 + 모바일웹 선택
5. 생성 완료

> ⚠️ "블로그"/"카페" API 는 별도 검수 없이 바로 사용 가능하지만, 네이버 로그인 개발 단계에서는 **등록된 테스트 계정만** 로그인 가능합니다. 실서비스 전환(모든 사용자 허용)은 개발자센터에서 검수 신청이 필요합니다.

---

## 2️⃣ 서비스 URL / Callback URL 등록

애플리케이션 설정 화면에서:

- **서비스 URL**: `https://hubontrade.com`
- **Callback URL**: `https://hubontrade.com/sns-platform/pages/naver-callback.html`

저장.

---

## 3️⃣ Client ID / Client Secret 확인

애플리케이션 정보 화면에서 다음 두 값 복사:

- **Client ID**: 클라이언트(브라우저) 코드에 들어가도 OK
- **Client Secret**: 절대 클라이언트에 노출 금지 (Edge Function 환경변수에만)

---

## 4️⃣ Supabase Edge Function 배포

### 4-1. 환경변수 설정

```bash
supabase secrets set NAVER_CLIENT_ID=<발급받은_client_id>
supabase secrets set NAVER_CLIENT_SECRET=<발급받은_client_secret>
```

### 4-2. Function 배포

```bash
cd /path/to/divoost-website
supabase functions deploy naver-oauth-exchange
supabase functions deploy naver-publish
```

배포 성공시 다음 URL 에서 호출 가능:
```
https://unruyezigyybnuvgdgdt.supabase.co/functions/v1/naver-oauth-exchange
https://unruyezigyybnuvgdgdt.supabase.co/functions/v1/naver-publish
```

---

## 5️⃣ 클라이언트 코드에 Client ID 설정

`sns-platform/pages/settings.html` 파일을 열고 다음 줄을 찾아 수정:

```javascript
// 기존
var NAVER_CLIENT_ID = '';

// 수정
var NAVER_CLIENT_ID = '발급받은Client_ID';
```

저장 후 commit & push.

---

## 6️⃣ 동작 테스트

1. 라이브 사이트 강력 새로고침: `Cmd+Shift+R`
   - https://hubontrade.com/sns-platform/pages/settings.html
2. 네이버 블로그 섹션 → **"📗 네이버 계정으로 한 번에 연동 (OAuth, 블로그+카페)"** 클릭
3. 팝업 → 네이버 로그인 → 권한 동의
4. callback 페이지에서 자동 토큰 교환 → `naver_blog`, `naver_cafe` 두 채널에 동시 저장
5. 모달 표시: ✅ 네이버 연동 완료
6. **카페 발행을 쓰려면**: 설정 페이지의 "네이버 카페" 계정 카드에서 ✏️ 수정 → **카페ID(clubid)**, **게시판ID(menuid)** 입력 필요 (아래 7️⃣ 참고). 블로그는 추가 설정 없이 바로 발행 가능.
7. `publish.html` 에서 채널에 "네이버 블로그"/"네이버 카페" 선택 → 발행

---

## 7️⃣ 카페ID(clubid) / 게시판ID(menuid) 찾는 법

네이버 로그인 OAuth 만으로는 "어느 카페의 어느 게시판에 쓸지"를 알 수 없어 수동 입력이 필요합니다.

1. 글을 쓸 카페에 접속 → 원하는 게시판 클릭
2. 주소창 URL 확인 (PC웹 기준): `https://cafe.naver.com/ArticleList.nhn?search.clubid=12345678&search.menuid=99`
   - `search.clubid=` 뒤 숫자 = **clubid**
   - `search.menuid=` 뒤 숫자 = **menuid**
3. (모바일 앱 URL 은 다른 형식이므로 PC웹에서 확인 권장)

---

## 🚨 발행시 알아둘 점

### 블로그 글쓰기 (`/blog/writePost`)
- 제목(title)은 본문 첫 줄(최대 100자)에서 자동 추출됩니다.
- 공개 설정 기본값: `openType=all` (전체 공개)
- 카테고리: 설정 페이지의 네이버 블로그 계정 카드에서 **"📂 카테고리 불러오기"**로 조회 후 선택 가능. 미지정 시 기본 카테고리로 발행됩니다.
- 이미지: `publish.html`에서 첨부한 이미지가 자동으로 함께 발행됩니다(최대 10장, 장당 20MB). 영상은 이 API가 지원하지 않아 자동 제외됩니다.

### 카페 글쓰기 (`/v1/cafe/{clubid}/menu/{menuid}/articles`)
- `clubid`/`menuid` 미입력 시 발행이 차단됩니다 (설정 필요 안내 메시지 표시).
- 게시판이 "글쓰기 권한 제한"(등급/가입기간 등)이 걸려있으면 API 호출도 동일하게 거부됩니다 — 본인 카페이거나 충분한 등급이 필요합니다.
- 이미지: 블로그와 동일하게 첨부 이미지가 자동 포함됩니다.

---

## 🔄 토큰 갱신

네이버 access token 만료시(기본 1시간, 발급 시 협의된 만료기간에 따라 다를 수 있음) **자동으로 refresh_token 을 사용해 갱신됩니다** (`publish.html`의 `ensureNaverToken()` — 만료 5분 전부터 발행 직전에 자동 체크·갱신, `naver-oauth-exchange`에 `grant_type: 'refresh_token'` 요청). refresh_token 자체가 만료/폐기된 경우에만 재로그인(OAuth 재연동)이 필요합니다.

---

## 📚 참고 자료

- [네이버 오픈 API 가이드](https://naver.github.io/naver-openapi-guide/)
- [네이버 개발자센터](https://developers.naver.com)
