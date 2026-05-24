# 1688-쿠팡 소싱 트래커 시스템 기획서

> 최종 수정: 2025-05-24
> 목표: 1688 인기상품 + 쿠팡 트렌드를 매일 자동 수집하여 마진 높은 소싱 기회를 대시보드로 제공

---

## 1. 시스템 개요

### 1.1 핵심 목표
```
매일 아침, GitHub에서 클릭 한 번으로
"오늘 쿠팡에서 뜨는 상품 중 1688에서 싸게 소싱할 수 있는 것"을 확인
```

### 1.2 시스템 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (매일 09:00 KST)               │
│                    또는 수동 버튼 클릭 실행                        │
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│   STEP 1             │   STEP 2                                 │
│   쿠팡 트렌드 수집     │   1688 소싱 상품 수집                     │
│                      │                                          │
│   ┌────────────┐     │   ┌────────────┐                         │
│   │ Coupang    │     │   │ 1688.com   │                         │
│   │ WING API   │     │   │ Playwright │                         │
│   └─────┬──────┘     │   └─────┬──────┘                         │
│         │            │         │                                 │
│   카테고리별:         │   跨境专供 필터:                            │
│   - 베스트셀러       │   - 직배송 가능 상품                        │
│   - 신상품           │   - 공장 직판가                             │
│   - 리뷰 급상승      │   - MOQ / 배송비                           │
│   - 가격대별         │   - 공급상 신뢰도                           │
│         │            │         │                                 │
├─────────┴────────────┴─────────┴────────────────────────────────┤
│                                                                 │
│   STEP 3: 데이터 매칭 & 마진 분석                                 │
│                                                                 │
│   쿠팡 인기상품 키워드 → 1688 검색 → 가격 비교 → 마진 계산          │
│   - 원가 + 국제배송비 + 관세 + 쿠팡수수료 = 예상 마진               │
│   - 마진율 30% 이상 상품만 추천 리스트에 포함                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STEP 4: 리포트 생성 & 배포                                     │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ HTML 대시보드 │  │ JSON 데이터  │  │ 트렌드 히스토리│          │
│   │ (GitHub Pages)│  │ (일별 저장)  │  │ (가격 변동)   │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택

### 2.1 백엔드 (데이터 수집)
| 구성요소 | 기술 | 선택 이유 |
|---------|------|----------|
| 언어 | Python 3.11+ | 스크래핑/데이터 처리 생태계 |
| 쿠팡 데이터 | Coupang WING API (공식) | 안정적, 합법적, 셀러 계정 보유 |
| 1688 데이터 | Playwright (Python) | JS 렌더링 필요, 안티봇 대응 |
| 데이터 저장 | JSON 파일 (Git 저장) | 별도 DB 불필요, 히스토리 추적 |
| 리포트 생성 | Jinja2 템플릿 | HTML 대시보드 자동 생성 |

### 2.2 인프라
| 구성요소 | 기술 | 선택 이유 |
|---------|------|----------|
| 자동화 | GitHub Actions | 무료 (월 2,000분), cron + 수동 트리거 |
| 호스팅 | GitHub Pages | 무료, 자동 배포 |
| 알림 (선택) | Telegram Bot / Email | 핫 아이템 발견 시 즉시 알림 |

### 2.3 프로젝트 디렉토리 구조
```
divoost-website/
├── .github/
│   └── workflows/
│       └── sourcing-tracker.yml      # GitHub Actions 워크플로우
│
├── tracker/                          # 소싱 트래커 메인 코드
│   ├── config.py                     # 설정 (카테고리, 키워드, 임계값)
│   ├── coupang_collector.py          # 쿠팡 WING API 데이터 수집
│   ├── alibaba_collector.py          # 1688 스크래핑 (Playwright)
│   ├── analyzer.py                   # 매칭 & 마진 분석
│   ├── report_generator.py           # HTML 리포트 생성 (Jinja2)
│   ├── notifier.py                   # 알림 발송 (선택)
│   ├── main.py                       # 전체 파이프라인 실행
│   │
│   ├── templates/                    # Jinja2 HTML 템플릿
│   │   ├── dashboard.html            # 메인 대시보드
│   │   ├── product_card.html         # 상품 카드 컴포넌트
│   │   └── trend_chart.html          # 트렌드 차트
│   │
│   ├── keywords/                     # 검색 키워드 매핑
│   │   ├── category_map.json         # 쿠팡 카테고리 → 1688 키워드 매핑
│   │   └── blacklist.json            # 제외 키워드 (브랜드, 인증 필요 등)
│   │
│   └── requirements.txt              # Python 패키지
│
├── data/                             # 수집된 데이터 (Git 추적)
│   ├── daily/                        # 일별 수집 데이터
│   │   ├── 2025-05-24/
│   │   │   ├── coupang_trends.json
│   │   │   ├── alibaba_products.json
│   │   │   └── analysis_result.json
│   │   └── ...
│   │
│   └── history/                      # 누적 트렌드 데이터
│       ├── price_history.json        # 가격 변동 히스토리
│       └── ranking_history.json      # 순위 변동 히스토리
│
├── dashboard/                        # GitHub Pages 대시보드 (자동 생성)
│   ├── index.html                    # 메인 대시보드 페이지
│   ├── css/
│   │   └── dashboard.css
│   ├── js/
│   │   └── dashboard.js             # 필터, 정렬, 차트
│   └── assets/
│
└── docs/
    └── sourcing-tracker-spec.md      # 이 기획서
```

---

## 3. 핵심 모듈 상세 설계

### 3.1 쿠팡 데이터 수집 (`coupang_collector.py`)

#### 사용 API: Coupang WING API
```
엔드포인트 구조:
├── 상품 검색 API
│   └── GET /v2/providers/seller_api/apis/api/v1/marketplace/seller-products
│
├── 카테고리 조회
│   └── GET /v2/providers/seller_api/apis/api/v1/marketplace/meta/categories
│
└── 주문/판매 데이터 (자사 상품)
    └── GET /v2/providers/openapi/apis/api/v4/vendors/{vendorId}/ordersheets
```

#### 수집 데이터 구조
```json
{
  "date": "2025-05-24",
  "category": "주방용품",
  "products": [
    {
      "product_id": "12345678",
      "name": "실리콘 주방용품 세트 10종",
      "price": 15900,
      "original_price": 29900,
      "discount_rate": 47,
      "review_count": 2847,
      "rating": 4.7,
      "rocket_delivery": true,
      "sales_rank": 3,
      "category_path": "홈/주방용품/조리도구",
      "keywords": ["실리콘", "주방세트", "주걱"],
      "seller_type": "마켓플레이스",
      "collected_at": "2025-05-24T09:00:00+09:00"
    }
  ]
}
```

#### 수집 카테고리 (초기 10개)
```python
TARGET_CATEGORIES = {
    "kitchen":      {"coupang_id": "xxx", "name": "주방용품",     "1688_keywords": ["硅胶厨具", "厨房收纳"]},
    "electronics":  {"coupang_id": "xxx", "name": "전자기기 액세서리", "1688_keywords": ["蓝牙耳机", "数据线"]},
    "home_decor":   {"coupang_id": "xxx", "name": "홈인테리어",    "1688_keywords": ["LED灯", "家居装饰"]},
    "beauty_tools": {"coupang_id": "xxx", "name": "뷰티도구",     "1688_keywords": ["化妆刷", "美妆工具"]},
    "fashion_acc":  {"coupang_id": "xxx", "name": "패션잡화",     "1688_keywords": ["包包", "袜子批发"]},
    "pet":          {"coupang_id": "xxx", "name": "반려동물",     "1688_keywords": ["宠物玩具", "宠物用品"]},
    "baby":         {"coupang_id": "xxx", "name": "유아동",       "1688_keywords": ["儿童玩具", "母婴用品"]},
    "sports":       {"coupang_id": "xxx", "name": "스포츠",       "1688_keywords": ["瑜伽垫", "健身器材"]},
    "car":          {"coupang_id": "xxx", "name": "자동차용품",    "1688_keywords": ["车载收纳", "汽车用品"]},
    "stationery":   {"coupang_id": "xxx", "name": "문구/사무",    "1688_keywords": ["文具", "办公用品"]},
}
```

#### 수집 기준 (카테고리별)
| 기준 | 수집 수량 | 정렬 |
|------|----------|------|
| 베스트셀러 | 상위 20개 | 판매량순 |
| 리뷰 급상승 | 상위 10개 | 최근 7일 리뷰 증가율 |
| 신상품 (30일 이내) | 상위 10개 | 리뷰수 + 판매량 |
| 가격대별 인기 | 각 5개 | 1만원대 / 2만원대 / 3만원 이상 |

---

### 3.2 1688 데이터 수집 (`alibaba_collector.py`)

#### 수집 방식: Playwright 웹 스크래핑
```
접근 경로:
├── 메인: https://kj.1688.com (跨境专区)
├── 검색: https://s.1688.com/selloffer/offer_search.htm?keywords=XXX
└── 필터: 跨境专供 체크 + 가격순/판매순 정렬
```

#### 수집 데이터 구조
```json
{
  "date": "2025-05-24",
  "search_keyword": "硅胶厨具",
  "mapped_coupang_category": "주방용품",
  "products": [
    {
      "product_id": "1688_abc123",
      "title": "硅胶厨具套装 10件套 食品级硅胶",
      "title_translated": "실리콘 주방도구 세트 10종 식품급 실리콘",
      "price_cny": 12.5,
      "price_range_cny": "8.00 - 15.00",
      "price_krw_estimated": 2375,
      "moq": 10,
      "total_sales": 5420,
      "store_name": "义乌XX厨具厂",
      "store_years": 5,
      "store_badges": ["实力商家", "超级工厂"],
      "cross_border": true,
      "direct_shipping_kr": true,
      "shipping_cost_estimated_krw": 1500,
      "product_url": "https://detail.1688.com/offer/xxx.html",
      "image_url": "https://...",
      "collected_at": "2025-05-24T09:05:00+09:00"
    }
  ]
}
```

#### 안티봇 대응 전략
```
1. 요청 간격: 3~8초 랜덤 딜레이
2. User-Agent 로테이션
3. 세션당 최대 50페이지로 제한
4. 실패 시 지수 백오프 재시도 (최대 3회)
5. 일일 수집량 제한: 카테고리당 30~50개 상품
```

---

### 3.3 마진 분석 엔진 (`analyzer.py`)

#### 마진 계산 공식

```python
def calculate_margin(item_1688, coupang_price):
    """
    마진 계산 공식
    """
    # 1. 상품 원가 (위안 → 원)
    cost_krw = item_1688["price_cny"] * EXCHANGE_RATE  # 약 190원/위안

    # 2. 국제 배송비 (무게 기반 추정)
    shipping_international = estimate_shipping(item_1688["weight_kg"])

    # 3. 관세 + 부가세
    #    과세가격 = (원가 + 운임) * 관세율
    #    부가세 = (과세가격 + 관세) * 10%
    customs_value = cost_krw + shipping_international
    if customs_value > 150000:  # 15만원 초과 시 과세
        customs_duty = customs_value * DUTY_RATE  # 카테고리별 상이 (8~13%)
        vat = (customs_value + customs_duty) * 0.10
    else:
        customs_duty = 0
        vat = 0

    # 4. 총 원가
    total_cost = cost_krw + shipping_international + customs_duty + vat

    # 5. 쿠팡 수수료 (카테고리별 5~15%)
    coupang_fee = coupang_price * COUPANG_FEE_RATE

    # 6. 예상 마진
    margin = coupang_price - total_cost - coupang_fee
    margin_rate = (margin / coupang_price) * 100

    return {
        "cost_breakdown": {
            "product_cost_krw": cost_krw,
            "shipping_krw": shipping_international,
            "customs_duty_krw": customs_duty,
            "vat_krw": vat,
            "total_cost_krw": total_cost,
            "coupang_fee_krw": coupang_fee
        },
        "coupang_sell_price": coupang_price,
        "expected_margin_krw": margin,
        "margin_rate_percent": round(margin_rate, 1),
        "recommendation": "STRONG_BUY" if margin_rate >= 40 else
                          "BUY" if margin_rate >= 30 else
                          "HOLD" if margin_rate >= 20 else
                          "SKIP"
    }
```

#### 추천 등급 기준
| 등급 | 마진율 | 조건 | 대시보드 표시 |
|------|-------|------|------------|
| STRONG_BUY | 40%+ | 마진 높음 + 직배송 가능 | 🟢 강력 추천 |
| BUY | 30~39% | 마진 양호 | 🔵 추천 |
| HOLD | 20~29% | 검토 필요 | 🟡 보류 |
| SKIP | 20% 미만 | 마진 부족 | 🔴 비추천 |

#### 추가 점수 가산
```
+ 직배송 가능 (跨境专供): +5점
+ 공급상 실력상가/슈퍼팩토리 배지: +3점
+ MOQ 50개 이하: +3점
+ 쿠팡 리뷰 급상승 (7일): +5점
+ 경쟁 셀러 5개 이하: +5점
- KC인증 필요 카테고리: -10점 (경고 표시)
- 브랜드 침해 위험: 자동 제외
```

---

### 3.4 리포트 & 대시보드 (`report_generator.py`)

#### 대시보드 구성

```
┌─────────────────────────────────────────────────────────────┐
│  📊 1688→쿠팡 소싱 트래커 대시보드        2025-05-24 업데이트  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📌 오늘의 요약                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 수집상품  │  │ 추천상품  │  │ 평균마진  │  │ 신규발견  │    │
│  │   342개   │  │   47개   │  │  38.2%   │  │   12개   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏆 TOP 추천 상품 (마진율 순)                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. 실리콘 주방세트                                    │    │
│  │    쿠팡: 15,900원 | 1688: 12.5元 | 마진: 52%        │    │
│  │    🟢 STRONG_BUY | 직배송 ✓ | 실력상가 ✓             │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 2. LED 무드등                                        │    │
│  │    쿠팡: 12,900원 | 1688: 18元 | 마진: 45%           │    │
│  │    🟢 STRONG_BUY | 직배송 ✓ | MOQ: 20               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📈 카테고리별 기회 분석                                      │
│  [필터: 전체 | 주방 | 전자 | 뷰티 | 홈 | 패션 | 펫 | ...]    │
│                                                             │
│  카테고리    | 수집 | 추천 | 평균마진 | 트렌드                  │
│  주방용품    |  42  |  12  |  41.2%  |  ↑ 상승                │
│  전자액세서리 |  38  |   8  |  38.7%  |  → 유지                │
│  뷰티도구    |  35  |  11  |  45.1%  |  ↑ 상승                │
│  ...                                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 7일 트렌드                                               │
│  [마진율 변동 차트]  [신규 발견 추이]  [가격 변동 TOP 10]       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ 주의 상품 (KC인증 필요 / 브랜드 위험)                     │
│  - [상품명] : KC 전기안전 인증 필요                            │
│  - [상품명] : 브랜드 로고 감지 → 제외 처리                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 대시보드 기능
- 카테고리 필터링
- 마진율/판매량/리뷰 기준 정렬
- 1688 상품 페이지 직접 링크
- 7일/30일 트렌드 차트 (Chart.js)
- 모바일 반응형

---

## 4. GitHub Actions 워크플로우

### 4.1 워크플로우 설정

```yaml
# .github/workflows/sourcing-tracker.yml
name: 1688-Coupang Sourcing Tracker

on:
  schedule:
    # 매일 오전 9시 (KST) = UTC 00:00
    - cron: '0 0 * * *'

  workflow_dispatch:
    # GitHub에서 수동 실행 버튼
    inputs:
      categories:
        description: '수집할 카테고리 (all 또는 kitchen,beauty 등)'
        required: false
        default: 'all'
      mode:
        description: '실행 모드'
        required: false
        default: 'full'
        type: choice
        options:
          - full        # 전체 수집 + 분석 + 리포트
          - coupang     # 쿠팡만 수집
          - alibaba     # 1688만 수집
          - report      # 기존 데이터로 리포트만 재생성

env:
  COUPANG_ACCESS_KEY: ${{ secrets.COUPANG_ACCESS_KEY }}
  COUPANG_SECRET_KEY: ${{ secrets.COUPANG_SECRET_KEY }}
  COUPANG_VENDOR_ID: ${{ secrets.COUPANG_VENDOR_ID }}
  EXCHANGE_RATE_API: ${{ secrets.EXCHANGE_RATE_API }}
  TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
  TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}

jobs:
  collect-and-analyze:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r tracker/requirements.txt
          playwright install chromium

      - name: Run Sourcing Tracker
        run: |
          python tracker/main.py \
            --categories "${{ github.event.inputs.categories || 'all' }}" \
            --mode "${{ github.event.inputs.mode || 'full' }}"

      - name: Deploy Dashboard to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dashboard
          publish_branch: gh-pages

      - name: Commit daily data
        run: |
          git config user.name "Sourcing Bot"
          git config user.email "bot@ezcomet.com"
          git add data/
          git diff --staged --quiet || git commit -m "📊 Daily sourcing data $(date +%Y-%m-%d)"
          git push
```

### 4.2 수동 실행 방법
```
GitHub 리포지토리 → Actions 탭 → "1688-Coupang Sourcing Tracker"
→ "Run workflow" 버튼 클릭 → 옵션 선택 → 실행
```

### 4.3 GitHub Secrets 설정 필요
```
COUPANG_ACCESS_KEY    # 쿠팡 WING API Access Key
COUPANG_SECRET_KEY    # 쿠팡 WING API Secret Key
COUPANG_VENDOR_ID     # 쿠팡 벤더 ID
TELEGRAM_BOT_TOKEN    # (선택) 텔레그램 알림
TELEGRAM_CHAT_ID      # (선택) 텔레그램 채팅 ID
```

---

## 5. 데이터 파이프라인 상세

### 5.1 일일 실행 흐름

```
09:00  시작
  │
  ├── [1] 환율 조회 (CNY/KRW)
  │     └── 한국은행 or ExchangeRate API
  │
  ├── [2] 쿠팡 데이터 수집 (약 5분)
  │     ├── 10개 카테고리 × 4 기준 = 40 API 호출
  │     ├── 카테고리당 20~45개 상품 수집
  │     └── 총 약 300~450개 상품 데이터
  │
  ├── [3] 1688 데이터 수집 (약 10분)
  │     ├── 쿠팡 인기 키워드 기반 검색
  │     ├── 跨境专供 필터 적용
  │     ├── 카테고리당 30~50개 상품 스크래핑
  │     └── 총 약 300~500개 상품 데이터
  │
  ├── [4] 매칭 & 분석 (약 2분)
  │     ├── 상품명/키워드 유사도 매칭
  │     ├── 마진 계산
  │     ├── 추천 등급 부여
  │     └── 트렌드 비교 (전일 대비)
  │
  ├── [5] 리포트 생성 (약 1분)
  │     ├── HTML 대시보드 렌더링
  │     ├── JSON 데이터 저장
  │     └── 히스토리 업데이트
  │
  └── [6] 배포 & 알림 (약 1분)
        ├── GitHub Pages 배포
        ├── 데이터 커밋
        └── (선택) 텔레그램 핫 아이템 알림
  │
09:20  완료 (총 약 20분)
```

### 5.2 상품 매칭 로직

```python
def match_products(coupang_products, alibaba_products):
    """
    쿠팡 인기상품과 1688 소싱 상품을 매칭
    """
    matches = []

    for cp in coupang_products:
        # 1. 카테고리 매핑으로 1688 후보군 필터
        candidates = filter_by_category(alibaba_products, cp["category"])

        # 2. 키워드 유사도 계산
        for ab in candidates:
            similarity = calculate_similarity(
                cp["keywords"],
                ab["title_translated"]
            )

            if similarity > 0.3:  # 30% 이상 유사
                margin = calculate_margin(ab, cp["price"])

                matches.append({
                    "coupang": cp,
                    "alibaba": ab,
                    "similarity_score": similarity,
                    "margin_analysis": margin,
                    "recommendation": margin["recommendation"]
                })

    # 마진율 기준 정렬
    matches.sort(key=lambda x: x["margin_analysis"]["margin_rate_percent"], reverse=True)

    return matches
```

---

## 6. 쿠팡 WING API 상세 활용 계획

### 6.1 사용할 API 엔드포인트

| API | 용도 | 호출 빈도 |
|-----|------|----------|
| 카테고리 조회 | 카테고리 ID 매핑 | 주 1회 |
| 상품 검색 | 카테고리별 인기 상품 조회 | 일 40회 |
| 상품 상세 | 가격, 리뷰 수, 판매 정보 | 일 300~500회 |
| 주문 통계 (자사) | 자사 판매 상품 성과 추적 | 일 1회 |

### 6.2 API 인증
```python
import hmac
import hashlib
import time

def generate_coupang_signature(method, url, secret_key, access_key):
    """쿠팡 WING API HMAC 서명 생성"""
    datetime_now = time.strftime('%y%m%dT%H%M%SZ', time.gmtime())

    message = datetime_now + method + url
    signature = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return f"CEA algorithm=HmacSHA256, access-key={access_key}, " \
           f"signed-date={datetime_now}, signature={signature}"
```

### 6.3 Rate Limit 대응
```
- 쿠팡 API: 초당 10건 제한
- 호출 간 100ms 대기
- 429 응답 시 지수 백오프 (1s, 2s, 4s)
- 일일 총 호출 1,000건 이하로 관리
```

---

## 7. 구현 일정 (Phase별)

### Phase 1: 기반 구축 (1~2일)
```
✅ 프로젝트 구조 생성
✅ Python 환경 세팅 (requirements.txt)
✅ 쿠팡 WING API 연동 & 인증 테스트
✅ 기본 GitHub Actions 워크플로우
```

### Phase 2: 쿠팡 수집기 (2~3일)
```
✅ 카테고리별 인기 상품 수집
✅ 베스트셀러 / 신상품 / 리뷰 급상승 분류
✅ JSON 데이터 저장 구조
✅ 수동 실행 테스트
```

### Phase 3: 1688 수집기 (3~4일)
```
✅ Playwright 기반 1688 스크래핑
✅ 跨境专供 필터 자동 적용
✅ 직배송 가능 상점 필터링
✅ 안티봇 대응 (딜레이, UA 로테이션)
```

### Phase 4: 분석 엔진 (1~2일)
```
✅ 상품 매칭 알고리즘
✅ 마진 계산기 (배송비, 관세, 수수료 포함)
✅ 추천 등급 시스템
✅ 위험 상품 감지 (KC인증, 브랜드)
```

### Phase 5: 대시보드 (2~3일)
```
✅ Jinja2 HTML 대시보드 템플릿
✅ 카테고리 필터 & 정렬
✅ 7일 트렌드 차트 (Chart.js)
✅ 모바일 반응형
✅ GitHub Pages 자동 배포
```

### Phase 6: 자동화 & 알림 (1일)
```
✅ 매일 09:00 KST 자동 실행
✅ (선택) 텔레그램 핫 아이템 알림
✅ 에러 핸들링 & 로깅
✅ 데이터 자동 커밋
```

### 총 예상 기간: 약 10~15일

---

## 8. 리스크 & 대응 방안

### 8.1 기술 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 1688 페이지 구조 변경 | 중 | 높음 | CSS 셀렉터 모듈화, 변경 감지 알림 추가 |
| 1688 봇 차단 | 중 | 높음 | IP 로테이션, 요청 간격 조절, Headless 브라우저 핑거프린트 변경 |
| 쿠팡 API 제한 강화 | 낮 | 중 | 호출 최적화, 캐싱 도입 |
| GitHub Actions 시간 초과 | 낮 | 중 | 카테고리 분할 실행, 병렬 Job |

### 8.2 비즈니스 리스크

| 리스크 | 대응 |
|--------|------|
| 환율 급변동 | 실시간 환율 반영, 마진 안전 마진 5% 추가 |
| 경쟁 심화 | 니치 카테고리 발굴 자동화, 트렌드 조기 감지 |
| 통관 규정 변경 | 관세청 API 연동 (향후), 규정 변경 알림 |

---

## 9. 향후 확장 계획

### v2.0 (추후)
- 상품 이미지 AI 유사도 매칭
- 쿠팡 경쟁 셀러 분석 (가격, 리뷰 전략)
- 자동 상품 등록 연동 (WING API)
- 다국어 상품명 번역 자동화

### v3.0 (장기)
- 타오바오/알리익스프레스 소싱 채널 추가
- 네이버 스마트스토어 / 11번가 등 다채널 확장
- AI 기반 수요 예측 모델
- 재고 관리 & 자동 발주 시스템

---

## 10. 필요 사전 준비

### 시작 전 확인 체크리스트

```
[ ] 쿠팡 WING API Access Key / Secret Key 확보
[ ] 쿠팡 Vendor ID 확인
[ ] GitHub 리포지토리 Secrets 등록
[ ] GitHub Pages 활성화 (Settings → Pages → gh-pages branch)
[ ] 1688.com 계정 생성 (로그인 필요 시)
[ ] (선택) 텔레그램 봇 생성 & Chat ID 확인
[ ] Python 3.11+ 로컬 테스트 환경
```

---

## 부록: Python 패키지 목록

```
# tracker/requirements.txt

# 쿠팡 API
requests==2.31.0
hmac-auth==0.1.0

# 1688 스크래핑
playwright==1.44.0
beautifulsoup4==4.12.3
lxml==5.2.2

# 데이터 처리
pandas==2.2.2

# 리포트 생성
jinja2==3.1.4

# 유틸리티
python-dotenv==1.0.1
schedule==1.2.2

# (선택) 알림
python-telegram-bot==21.3

# (선택) 번역
deep-translator==1.11.4
```
