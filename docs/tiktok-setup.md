# TikTok OAuth + Content Posting 연동 설정 가이드

DIVOOST SNS 플랫폼에 TikTok 자동 발행 기능을 활성화하는 단계별 안내입니다.

## 📋 사전 준비물

- TikTok 비즈니스/개인 계정 (영상 게시 권한 보유)
- Supabase 프로젝트 (Edge Function 배포 권한)
- Supabase CLI 설치 (`npm i -g supabase`)

---

## 1️⃣ TikTok 개발자 앱 생성

1. **https://developers.tiktok.com/apps** 접속 → 본인 TikTok 계정으로 로그인
2. **"Create an app"** 클릭
3. 앱 정보 입력:
   - **App name**: `DIVOOST-SNS`
   - **App description**: SNS 멀티 채널 자동 포스팅 플랫폼
   - **Category**: Business
4. 생성 완료

---

## 2️⃣ 제품(Products) 추가

생성된 앱 페이지에서 다음 제품 추가:

### Login Kit (필수)
- 신청 사유: SNS 발행을 위한 사용자 인증
- 필요 Scopes:
  - `user.info.basic`

### Content Posting API (필수)
- 신청 사유: 영상 콘텐츠 자동 게시
- 필요 Scopes:
  - `video.publish`
  - `video.upload`

> ⚠️ Content Posting API 는 TikTok 측에서 검수합니다. 검수 통과 전에는 sandbox 모드로 테스트해야 합니다.

---

## 3️⃣ Redirect URI 등록

앱 설정 → **"Login Kit"** → **"Redirect URI"** 칸에 추가:

```
https://divoost.github.io/divoost-website/sns-platform/pages/tiktok-callback.html
```

저장 후 변경사항이 반영될 때까지 몇 분 대기.

---

## 4️⃣ Client Key / Secret 확인

앱 페이지 상단에서 다음 두 값 복사:

- **Client Key** (`aw...` 또는 `sb...` 형태): 클라이언트(브라우저) 코드에 들어가도 OK
- **Client Secret**: 절대 클라이언트에 노출 금지 (Edge Function 환경변수에만)

> Secret 은 1번만 표시되므로 안전한 곳에 저장.

---

## 5️⃣ Supabase Edge Function 배포

### 5-1. 환경변수 설정

```bash
supabase secrets set TIKTOK_CLIENT_KEY=<발급받은_client_key>
supabase secrets set TIKTOK_CLIENT_SECRET=<발급받은_client_secret>
```

### 5-2. Function 배포

```bash
cd /path/to/divoost-website
supabase functions deploy tiktok-oauth-exchange
```

배포 성공시 다음 URL 에서 호출 가능:
```
https://unruyezigyybnuvgdgdt.supabase.co/functions/v1/tiktok-oauth-exchange
```

---

## 6️⃣ 클라이언트 코드에 Client Key 설정

`sns-platform/pages/settings.html` 파일을 열고 다음 줄을 찾아 수정:

```javascript
// 기존
var TIKTOK_CLIENT_KEY = '';

// 수정
var TIKTOK_CLIENT_KEY = 'aw발급받은Client_Key';
```

저장 후 commit & push.

---

## 7️⃣ 동작 테스트

1. 라이브 사이트 강력 새로고침: `Cmd+Shift+R`
   - https://divoost.github.io/divoost-website/sns-platform/pages/settings.html
2. TikTok 섹션 → **"🎵 TikTok 계정으로 한 번에 연동 (OAuth)"** 클릭
3. 팝업 → TikTok 로그인 → 권한 동의
4. callback 페이지에서 자동 토큰 교환 → settings 에 저장
5. 모달 표시: ✅ TikTok 연동 완료
6. `publish.html` 에서 영상 첨부 → TikTok 선택 → 발행

---

## 🚨 발행시 알아둘 점

### Content Posting API 제약

- **영상 필수**: 텍스트만으로는 게시 불가. 영상 첨부 필수.
- **영상 길이**: 3초 ~ 10분
- **영상 크기**: 최대 4GB
- **포맷**: MP4, MOV
- **Privacy 기본값**: `SELF_ONLY` (본인만 볼 수 있음 - 안전 기본값)
  - 다른 사용자에게도 보이려면 UI 에서 옵션 추가 필요
  - 가능 값: `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY`

### Sandbox vs Production

- 검수 통과 전: sandbox 모드 → 본인 계정에서만 발행 가능
- 검수 통과 후: 모든 사용자에게 OAuth 제공 가능

---

## 🔄 토큰 갱신

TikTok access token 만료시 (기본 24시간):

- `refresh_token` 으로 자동 갱신 (코드 추가 예정)
- 또는 수동 재인증 (settings.html 에서 다시 OAuth 실행)

---

## 🛠 트러블슈팅

### "Invalid client_key" 에러
→ TIKTOK_CLIENT_KEY 환경변수 또는 settings.html 의 `TIKTOK_CLIENT_KEY` 값 확인

### "Invalid redirect_uri" 에러
→ TikTok 콘솔의 Redirect URI 와 정확히 일치하는지 확인 (대소문자, 슬래시 포함)

### "Scope not authorized" 에러
→ TikTok 콘솔에서 해당 scope 검수 통과 여부 확인

### 발행이 PROCESSING 상태에서 멈춤
→ TikTok 측 처리 지연. 최대 2-3분 대기 후 publish_id 로 직접 확인

---

## 📚 참고 자료

- TikTok Developer Portal: https://developers.tiktok.com/
- Content Posting API 문서: https://developers.tiktok.com/doc/content-posting-api-overview
- OAuth 흐름 문서: https://developers.tiktok.com/doc/login-kit-web
