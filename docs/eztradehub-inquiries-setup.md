# EZ TRADE HUB 문의 폼 백엔드 설정

> 문의 폼이 mailto 외에도 Supabase DB에 저장되도록 설정.

## 1) Supabase 테이블 생성

Supabase SQL Editor에서 실행:

```sql
CREATE TABLE IF NOT EXISTS eth_inquiries (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  company TEXT,
  phone TEXT,
  email TEXT,
  service TEXT,
  market TEXT,
  budget TEXT,
  source TEXT,
  message TEXT,
  lang TEXT DEFAULT 'en',
  user_agent TEXT,
  referer TEXT,
  status TEXT DEFAULT 'new',  -- new / contacted / closed
  notes TEXT
);

-- RLS: 익명 INSERT 허용 (방문자 누구나 문의 가능)
ALTER TABLE eth_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON eth_inquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 인덱스
CREATE INDEX idx_eth_inquiries_created ON eth_inquiries(created_at DESC);
CREATE INDEX idx_eth_inquiries_status ON eth_inquiries(status);
```

## 2) 문의 확인

문의가 들어오면 Supabase에서:
```
https://supabase.com/dashboard/project/unruyezigyybnuvgdgdt/editor
```

→ `eth_inquiries` 테이블 클릭 → 신규 문의 확인

## 3) 이메일 알림 (선택)

새 문의 시 자동 이메일 알림 받으려면:
1. Database → Webhooks → Create webhook
2. Trigger: `eth_inquiries` INSERT
3. URL: Resend / Zapier / Webhook.site 등

## 4) 동작 방식

1. 사용자가 폼 제출
2. JavaScript가 Supabase DB에 저장 (백엔드 영구 보관)
3. localStorage에도 백업 (네트워크 실패 대비)
4. mailto 링크로 이메일 클라이언트 열기

→ DB + 이메일 듀얼 보관으로 문의 누락 방지
