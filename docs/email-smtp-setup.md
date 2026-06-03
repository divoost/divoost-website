# 회원가입 이메일 SMTP 설정 (Resend.com)

> 회원가입 인증 이메일이 안 오는 문제 해결 가이드.
> 원인: Supabase 무료 SMTP 시간당 3통 제한. Custom SMTP로 해결.

## 1) Resend 계정 생성 (3분)

```
https://resend.com
```

→ Sign Up (Google 계정으로 가능)
→ 이메일 인증
→ 무료 플랜 **월 3,000통 / 일 100통**

## 2) 발신 도메인 등록 (5분)

### A. Resend 대시보드에서

→ 좌측 메뉴 **"Domains"** 클릭
→ **"Add Domain"** 클릭
→ 도메인 입력: `hubontrade.com`
→ Submit

### B. DNS 레코드 추가 (Cloudflare)

Resend가 다음 같은 DNS 레코드 표시:

```
Type    Name              Value
MX      send              feedback-smtp.us-east-1.amazonses.com  (Priority 10)
TXT     send              "v=spf1 include:amazonses.com ~all"
TXT     resend._domainkey "v=DKIM1; k=rsa; p=MIGfMA0..."
```

→ Cloudflare 대시보드 (https://dash.cloudflare.com) → hubontrade.com → DNS → Records
→ 위 3개 레코드 모두 추가
→ Save

### C. Resend에서 Verify

DNS 전파 후 (5분~24시간):
→ Resend Domains 페이지 → **"Verify DNS Records"** 클릭
→ 모두 ✅ 녹색 체크되면 완료

## 3) Resend API Key 발급

→ Resend 좌측 메뉴 **"API Keys"**
→ **"Create API Key"** 클릭
→ Name: `Supabase SMTP`
→ Permission: **Sending access** 선택
→ Domain: `hubontrade.com` (방금 등록한 것)
→ Create
→ **API Key 복사** (한 번만 표시됨, 잘 보관)

## 4) Supabase Auth SMTP 설정

```
https://supabase.com/dashboard/project/unruyezigyybnuvgdgdt/auth/templates
```

또는 좌측 메뉴 → **Project Settings** → **Authentication** → **Email Settings**

**"Enable Custom SMTP"** 토글 ON → 다음 입력:

| 항목 | 값 |
|---|---|
| **Sender email** | `noreply@hubontrade.com` |
| **Sender name** | `HUBONTRADE` |
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | (3단계에서 받은 API Key) |
| **Minimum interval** | `60` |

→ **Save** 클릭

## 5) 이메일 템플릿에 OTP 코드 추가

Supabase Auth → **"Email Templates"** → **"Confirm signup"** 선택

기존 템플릿에서 본문에 다음 추가:

```html
<h2>이메일 인증</h2>

<p>안녕하세요, {{ .Email }} 님</p>

<p>아래 인증 번호를 입력하여 가입을 완료해주세요:</p>

<h1 style="font-size:32px;letter-spacing:8px;background:#f3f4f6;padding:20px;text-align:center;border-radius:8px;">{{ .Token }}</h1>

<p>또는 아래 버튼 클릭:</p>

<p><a href="{{ .ConfirmationURL }}" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">이메일 인증하기</a></p>

<p style="color:#666;font-size:12px;">본 메일을 요청한 적이 없다면 무시해주세요.</p>
```

핵심: `{{ .Token }}` 변수가 6자리 인증번호 자리

→ **Save Template**

## 6) Confirm email 활성화

→ Auth → **Providers** → **Email** 클릭
→ **"Confirm email"** 토글 ON
→ Save

## 7) 테스트

```
https://hubontrade.com/sns-platform/auth.html
```

→ "회원가입" 탭
→ 이메일 + 비번 입력
→ 가입
→ **이메일 확인** (1분 내 도착해야 함)
→ 6자리 인증번호 복사
→ verify 화면에서 입력
→ 자동 로그인 ✓

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 메일 안 옴 | DNS 전파 안 됨 | 1시간 더 대기 |
| 메일 안 옴 (1시간+) | DNS 레코드 오타 | Cloudflare DNS 다시 확인 |
| "Email not confirmed" | Confirm email 토글 OFF | 6단계 진행 |
| 토큰 잘못됨 | OTP 만료 | 재발송 |
| Resend 에러 401 | API Key 잘못 | 다시 발급 |
| SMTP 인증 실패 | Username이 "resend" 아닌 다른 거 | "resend" 정확히 입력 |

## 비용 (참고)

- Resend 무료: 월 3,000통 / 일 100통
- 초과 시: 월 $20 (50,000통) ~ $80 (100,000통)

회원가입만 쓰면 무료 충분 (일 100명 가입 가능).
