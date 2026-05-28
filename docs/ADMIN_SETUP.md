# 🛡 관리자 콘솔 실제 운영 연결 가이드

## 📋 사전 준비
- Supabase 프로젝트: `unruyezigyybnuvgdgdt`
- 본인 Supabase Dashboard 로그인 완료

---

## 1️⃣ Supabase DB 스키마 생성

### 단계
1. https://supabase.com/dashboard/project/unruyezigyybnuvgdgdt/sql 접속
2. **"+ New query"** 클릭
3. `docs/supabase-admin-schema.sql` 파일 전체 복사
4. SQL 에디터에 붙여넣기
5. **"RUN"** 버튼 클릭 (또는 Ctrl+Enter)

### 생성되는 테이블 (7개)
| 테이블 | 용도 |
|--------|------|
| `profiles` | 사용자 프로필 + 역할(role) |
| `activity_logs` | 사용자 활동 로그 |
| `sns_posts` | 발행한 콘텐츠 이력 |
| `reports` | 신고 접수 |
| `notices` | 관리자 공지 |
| `audit_logs` | 관리자 작업 감사 로그 (변경 불가) |
| `api_usage` | API 호출 통계 |

---

## 2️⃣ 본인을 관리자로 설정 ⭐ 필수

### 단계
1. Supabase SQL 에디터에서 다음 쿼리 실행:
```sql
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'ezwebpia001@gmail.com';
```

> 본인 이메일로 변경해서 실행하세요!

2. 확인:
```sql
SELECT email, role FROM public.profiles WHERE role IN ('admin', 'super_admin');
```

---

## 3️⃣ 관리자 페이지 접근

이제 관리자 페이지에 접근할 수 있습니다:

```
https://divoost.github.io/divoost-website/sns-platform/admin/
```

- ✅ 관리자 권한 자동 검증 (페이지 진입 시)
- ❌ 일반 사용자가 접근하면 거부 + 사용자 대시보드로 리다이렉트
- ✅ 모든 관리자 작업이 `audit_logs`에 자동 기록

---

## 🔄 실제 연동된 기능

### 자동으로 작동
- ✅ **로그인 시 자동 활동 기록** (LOGIN)
- ✅ **15분마다 last_active_at 갱신** (활성 사용자 추적)
- ✅ **신규 가입 시 자동 profiles 생성** (트리거)
- ✅ **관리자 작업 audit_logs 자동 기록**
- ✅ **Row Level Security**로 보안 자동 적용

### 관리자 페이지에서 작동
- ✅ **회원 목록**: Supabase profiles 테이블에서 실시간 조회
- ✅ **회원 정지**: profiles.status 변경 + audit_logs 기록
- ✅ **활동 로그**: activity_logs 테이블 실시간 조회
- ✅ **공지 발송**: notices 테이블에 저장
- ✅ **감사 로그**: audit_logs 테이블 조회

### 백엔드 추가 연동 필요
- ⏳ **결제 처리**: 토스페이먼츠/아임포트
- ⏳ **이메일 발송**: SendGrid/AWS SES
- ⏳ **푸시 알림**: FCM/APNs
- ⏳ **AI 콘텐츠 검수**: OpenAI Moderation API

---

## 🚨 보안 주의사항

### Row Level Security (RLS) 정책
스키마에는 RLS가 활성화되어 있어:
- 일반 사용자: 본인 데이터만 조회/수정 가능
- 관리자: 모든 사용자 데이터 조회/수정 가능
- 감사 로그: 변경/삭제 불가 (INSERT만 허용)

### 클라이언트 사이드 한계
GitHub Pages는 정적 호스팅이므로:
- ✅ Supabase 데이터베이스 직접 조회 가능
- ❌ 비밀 키(Service Role Key) 사용 불가
- ❌ 이메일/푸시 직접 발송 불가

→ 정식 운영 시 Supabase Edge Functions 또는 별도 백엔드 필요

---

## 🔧 트러블슈팅

### "관리자 권한이 없습니다" 에러
→ SQL에서 본인 role을 super_admin으로 변경했는지 확인

### "데이터를 불러올 수 없습니다" 에러
→ schema.sql을 SQL 에디터에서 실행했는지 확인

### "허용되지 않은 작업" 에러
→ RLS 정책 확인 / 로그아웃 후 재로그인

---

## 📊 운영 통계 쿼리 (보너스)

### 일일 신규 가입자
```sql
SELECT DATE(created_at) AS date, COUNT(*) AS new_users
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 활성 사용자 (최근 7일)
```sql
SELECT COUNT(*) AS active_users
FROM public.profiles
WHERE last_active_at > NOW() - INTERVAL '7 days';
```

### 플랜별 매출 (모의)
```sql
SELECT plan, COUNT(*) AS users,
    CASE plan
        WHEN 'pro' THEN COUNT(*) * 29000
        WHEN 'enterprise' THEN COUNT(*) * 149000
        ELSE 0
    END AS monthly_revenue
FROM public.profiles
WHERE status = 'active'
GROUP BY plan;
```

### 가장 활발한 사용자
```sql
SELECT user_email, COUNT(*) AS activity_count
FROM public.activity_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_email
ORDER BY activity_count DESC
LIMIT 10;
```

---

## 📌 다음 단계 (향후)

1. **Supabase Edge Functions** 추가
   - 이메일 발송 함수
   - 결제 웹훅 처리
   - AI 콘텐츠 검수

2. **실시간 Subscriptions**
   - 신규 신고 실시간 알림
   - 새 가입자 실시간 표시

3. **백오피스 별도 서버**
   - 사용자 정보 마스킹
   - GDPR/개인정보보호법 대응
