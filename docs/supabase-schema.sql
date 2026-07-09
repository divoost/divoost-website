-- Supabase SQL: 소싱 트래커 테이블 생성
-- Supabase Dashboard → SQL Editor에서 실행

-- 1. 상품 테이블
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL,
  currency TEXT DEFAULT 'KRW',
  platform TEXT NOT NULL,
  source TEXT DEFAULT 'scraping',
  category TEXT,
  image TEXT,
  url TEXT,
  rating DECIMAL,
  review_count INTEGER DEFAULT 0,
  is_rocket BOOLEAN DEFAULT false,
  trade_quantity INTEGER DEFAULT 0,
  supplier_name TEXT,
  status TEXT DEFAULT '조사중',
  memo TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 소싱 상품 관리 테이블
CREATE TABLE sourcing_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  source_platform TEXT,
  sell_platform TEXT,
  source_price DECIMAL,
  source_currency TEXT DEFAULT 'CNY',
  sell_price DECIMAL,
  sell_currency TEXT DEFAULT 'KRW',
  shipping_cost DECIMAL DEFAULT 0,
  margin_pct DECIMAL,
  monthly_sales INTEGER DEFAULT 0,
  sales_rank INTEGER,
  status TEXT DEFAULT '조사중',
  direct_shipping BOOLEAN DEFAULT false,
  keywords TEXT,
  badges TEXT,
  memo TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 크롤링 기록 테이블
CREATE TABLE crawl_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  keyword TEXT,
  product_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  source TEXT DEFAULT 'scraping',
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 플랫폼 통계 테이블
CREATE TABLE platform_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  total_products INTEGER DEFAULT 0,
  avg_price DECIMAL,
  avg_margin DECIMAL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, date)
);

-- RLS 정책 (공개 읽기/쓰기)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- ⚠️ 익명(anon) 키는 조회/삽입/수정만 허용하고 DELETE는 차단한다.
-- (FOR ALL USING(true) 는 익명 전체 삭제가 가능해 보안 위험 → 사용 금지)
-- 데이터 삭제/정리는 service_role(Edge Function)로만 수행 (RLS 우회).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','sourcing_items','crawl_logs','platform_stats'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public access %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "anon_select_%1$s" ON public.%1$s FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "anon_insert_%1$s" ON public.%1$s FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "anon_update_%1$s" ON public.%1$s FOR UPDATE USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 인덱스
CREATE INDEX idx_products_platform ON products(platform);
CREATE INDEX idx_products_scraped_at ON products(scraped_at);
CREATE INDEX idx_sourcing_items_date ON sourcing_items(date);
CREATE INDEX idx_crawl_logs_crawled_at ON crawl_logs(crawled_at);
CREATE INDEX idx_platform_stats_date ON platform_stats(date);
