/* Sample data for dashboard demo */
const SAMPLE_DATA = {
  lastUpdated: "2025-05-24T09:15:00+09:00",
  exchangeRate: 190.5,

  kpi: {
    totalProducts: { value: 487, change: 12, direction: "up", prev: 475 },
    recommended:   { value: 63,  change: 8,  direction: "up", prev: 55 },
    avgMargin:     { value: 41.2,change: 2.3,direction: "up", prev: 38.9 },
    newDiscovered: { value: 18,  change: 5,  direction: "up", prev: 13 },
    hotItems:      { value: 7,   change: 3,  direction: "up", prev: 4 },
    alerts:        { value: 4,   change: -1, direction: "down", prev: 5 }
  },

  categories: [
    { id:"kitchen",     emoji:"🍳", name:"주방용품",     products:52, recommended:14, avgMargin:43.2, trend:"up",   trendVal:"+3.1%" },
    { id:"electronics", emoji:"🎧", name:"전자기기",     products:48, recommended:10, avgMargin:38.7, trend:"flat", trendVal:"+0.2%" },
    { id:"home",        emoji:"🏠", name:"홈인테리어",   products:55, recommended:13, avgMargin:45.1, trend:"up",   trendVal:"+4.5%" },
    { id:"beauty",      emoji:"💄", name:"뷰티도구",     products:42, recommended:12, avgMargin:52.3, trend:"up",   trendVal:"+2.8%" },
    { id:"fashion",     emoji:"👜", name:"패션잡화",     products:60, recommended:8,  avgMargin:36.4, trend:"down", trendVal:"-1.2%" },
    { id:"pet",         emoji:"🐾", name:"반려동물",     products:38, recommended:9,  avgMargin:44.8, trend:"up",   trendVal:"+5.2%" },
    { id:"baby",        emoji:"👶", name:"유아/아동",    products:35, recommended:5,  avgMargin:38.1, trend:"flat", trendVal:"+0.5%" },
    { id:"sports",      emoji:"🏋️", name:"스포츠",       products:44, recommended:7,  avgMargin:35.2, trend:"flat", trendVal:"-0.3%" },
    { id:"car",         emoji:"🚗", name:"자동차용품",   products:42, recommended:6,  avgMargin:41.6, trend:"up",   trendVal:"+3.8%" },
    { id:"stationery",  emoji:"✏️", name:"문구/사무",    products:31, recommended:4,  avgMargin:39.5, trend:"down", trendVal:"-0.8%" }
  ],

  topProducts: [
    { rank:1,  name:"실리콘 주방용품 12종 세트",  category:"주방용품",  emoji:"🍳", coupangPrice:18900, price1688:12.5,  shippingKRW:1800, margin:54.2, marginGrade:"strong", reviews:3847,  reviewTrend:"+342",  salesRank:3,   rankChange:"+2",  directShipping:true,  badges:["实力商家"],    keywords:["硅胶厨具套装"] },
    { rank:2,  name:"LED 무드등 리모컨 포함",     category:"홈인테리어",emoji:"🏠", coupangPrice:15900, price1688:18.0,  shippingKRW:1200, margin:48.7, marginGrade:"strong", reviews:2156,  reviewTrend:"+528",  salesRank:5,   rankChange:"+4",  directShipping:true,  badges:["超级工厂"],    keywords:["LED氛围灯"] },
    { rank:3,  name:"메이크업 브러쉬 15종 세트",   category:"뷰티도구", emoji:"💄", coupangPrice:12900, price1688:8.5,   shippingKRW:800,  margin:56.8, marginGrade:"strong", reviews:5621,  reviewTrend:"+215",  salesRank:2,   rankChange:"0",   directShipping:true,  badges:["实力商家"],    keywords:["化妆刷套装"] },
    { rank:4,  name:"강아지 노즈워크 장난감",     category:"반려동물", emoji:"🐾", coupangPrice:9900,  price1688:6.0,   shippingKRW:1000, margin:51.3, marginGrade:"strong", reviews:1893,  reviewTrend:"+189",  salesRank:7,   rankChange:"+5",  directShipping:true,  badges:["超级工厂"],    keywords:["狗狗嗅闻玩具"] },
    { rank:5,  name:"TWS 블루투스 이어폰 5.3",    category:"전자기기", emoji:"🎧", coupangPrice:14900, price1688:22.0,  shippingKRW:1000, margin:42.1, marginGrade:"good",   reviews:8234,  reviewTrend:"+412",  salesRank:1,   rankChange:"0",   directShipping:true,  badges:["实力商家","超级工厂"], keywords:["蓝牙耳机TWS"] },
    { rank:6,  name:"차량용 트렁크 정리함",       category:"자동차용품",emoji:"🚗", coupangPrice:19900, price1688:25.0,  shippingKRW:2500, margin:44.8, marginGrade:"strong", reviews:1245,  reviewTrend:"+98",   salesRank:4,   rankChange:"+1",  directShipping:true,  badges:["实力商家"],    keywords:["车载收纳箱"] },
    { rank:7,  name:"에코백 캔버스 토트백",       category:"패션잡화", emoji:"👜", coupangPrice:8900,  price1688:5.5,   shippingKRW:800,  margin:45.2, marginGrade:"strong", reviews:4567,  reviewTrend:"+156",  salesRank:6,   rankChange:"-1",  directShipping:true,  badges:[],              keywords:["帆布包"] },
    { rank:8,  name:"몬테소리 원목 퍼즐 세트",    category:"유아/아동",emoji:"👶", coupangPrice:22900, price1688:28.0,  shippingKRW:2000, margin:38.5, marginGrade:"good",   reviews:987,   reviewTrend:"+67",   salesRank:12,  rankChange:"+3",  directShipping:false, badges:["实力商家"],    keywords:["蒙氏教具"] },
    { rank:9,  name:"요가매트 6mm 논슬립",        category:"스포츠",  emoji:"🏋️", coupangPrice:16900, price1688:20.0,  shippingKRW:3500, margin:33.1, marginGrade:"ok",     reviews:3421,  reviewTrend:"+89",   salesRank:8,   rankChange:"0",   directShipping:false, badges:[],              keywords:["瑜伽垫"] },
    { rank:10, name:"스테인리스 밀폐용기 4종",     category:"주방용품", emoji:"🍳", coupangPrice:21900, price1688:30.0,  shippingKRW:2200, margin:36.7, marginGrade:"good",   reviews:2876,  reviewTrend:"+234",  salesRank:9,   rankChange:"+2",  directShipping:true,  badges:["超级工厂"],    keywords:["不锈钢密封罐"] },
    { rank:11, name:"USB-C 고속 충전 케이블 3개",  category:"전자기기", emoji:"🎧", coupangPrice:7900,  price1688:3.5,   shippingKRW:500,  margin:52.6, marginGrade:"strong", reviews:12450, reviewTrend:"+856",  salesRank:2,   rankChange:"+1",  directShipping:true,  badges:["实力商家"],    keywords:["数据线"] },
    { rank:12, name:"고양이 스크래처 골판지",      category:"반려동물", emoji:"🐾", coupangPrice:11900, price1688:8.0,   shippingKRW:2000, margin:39.8, marginGrade:"good",   reviews:2134,  reviewTrend:"+178",  salesRank:11,  rankChange:"-2",  directShipping:true,  badges:[],              keywords:["猫抓板"] }
  ],

  trendHistory: {
    labels: ["05/18","05/19","05/20","05/21","05/22","05/23","05/24"],
    margin:   [37.8, 38.2, 39.1, 38.5, 40.3, 39.8, 41.2],
    products: [410, 425, 438, 445, 460, 475, 487],
    recommended: [42, 45, 48, 50, 52, 55, 63]
  },

  hourlyData: {
    labels: ["00","02","04","06","08","10","12","14","16","18","20","22"],
    searches: [120, 85, 60, 45, 210, 380, 450, 520, 490, 430, 350, 280],
    sales:    [30, 18, 12, 8, 55, 95, 120, 145, 135, 110, 85, 65]
  },

  monthlyData: {
    labels: ["1월","2월","3월","4월","5월"],
    totalProducts: [280, 310, 360, 420, 487],
    avgMargin: [34.2, 35.8, 37.5, 39.1, 41.2],
    hotItems: [12, 18, 22, 28, 35]
  },

  searchKeywords: [
    { rank:1, keyword:"실리콘 주방용품",  volume:28400, trend:"up",   change:"+15%" },
    { rank:2, keyword:"무선 이어폰",     volume:45200, trend:"flat", change:"+2%" },
    { rank:3, keyword:"LED 무드등",      volume:18700, trend:"up",   change:"+32%" },
    { rank:4, keyword:"강아지 장난감",    volume:22100, trend:"up",   change:"+18%" },
    { rank:5, keyword:"메이크업 브러쉬",  volume:15600, trend:"up",   change:"+24%" },
    { rank:6, keyword:"에코백",          volume:31200, trend:"down", change:"-5%" },
    { rank:7, keyword:"차량용 수납",     volume:12800, trend:"up",   change:"+21%" },
    { rank:8, keyword:"캠핑 LED",       volume:9800,  trend:"up",   change:"+45%" },
    { rank:9, keyword:"핸드폰 거치대",   volume:19500, trend:"flat", change:"+1%" },
    { rank:10,keyword:"고양이 스크래처",  volume:8900,  trend:"up",   change:"+28%" }
  ],

  reviewAnalysis: {
    avgRating: 4.3,
    totalReviews: 52840,
    photoReviews: 18420,
    reviewGrowth: "+12.4%",
    distribution: [
      { star:5, count:28540, pct:54 },
      { star:4, count:14210, pct:27 },
      { star:3, count:5810,  pct:11 },
      { star:2, count:2640,  pct:5 },
      { star:1, count:1640,  pct:3 }
    ]
  },

  alerts: [
    { type:"hot",    icon:"🔥", title:"LED 무드등 리뷰 급상승", desc:"최근 7일간 리뷰 528개 증가 (+42%). 1688 소싱가 대비 마진 48.7%", time:"2시간 전" },
    { type:"rising", icon:"📈", title:"강아지 노즈워크 순위 5단계 상승", desc:"쿠팡 판매 순위 12위 → 7위. 반려동물 카테고리 주목", time:"3시간 전" },
    { type:"price",  icon:"💰", title:"1688 실리콘 주방세트 단가 하락", desc:"12.5元 → 10.8元 (14% 하락). 마진율 54% → 58% 예상", time:"5시간 전" },
    { type:"new",    icon:"🆕", title:"신규 트렌드: 미니 빔프로젝터", desc:"쿠팡 검색량 7일 대비 +180%. 1688 소싱 가능성 조사 필요", time:"6시간 전" },
    { type:"hot",    icon:"⚠️", title:"캠핑 LED 시즌 피크 진입", desc:"검색량 전주 대비 +45%. 여름 시즌 재고 확보 권장", time:"8시간 전" }
  ],

  priceComparison: [
    { product:"실리콘 주방세트", price1688:2381, coupangPrice:18900, totalCost:8654, margin:10246, marginPct:54.2 },
    { product:"LED 무드등",     price1688:3429, coupangPrice:15900, totalCost:8157, margin:7743,  marginPct:48.7 },
    { product:"메이크업 브러쉬", price1688:1619, coupangPrice:12900, totalCost:5571, margin:7329,  marginPct:56.8 },
    { product:"블루투스 이어폰", price1688:4191, coupangPrice:14900, totalCost:8626, margin:6274,  marginPct:42.1 }
  ],

  categoryTrend: {
    labels: ["05/18","05/19","05/20","05/21","05/22","05/23","05/24"],
    datasets: {
      "주방용품":  [40.1, 41.2, 42.0, 41.5, 42.8, 43.0, 43.2],
      "뷰티도구":  [48.5, 49.2, 50.1, 51.0, 51.5, 52.0, 52.3],
      "홈인테리어": [40.5, 41.0, 42.2, 43.0, 43.8, 44.5, 45.1],
      "반려동물":  [39.5, 40.2, 41.0, 42.5, 43.0, 44.0, 44.8],
      "전자기기":  [37.5, 37.8, 38.0, 38.2, 38.5, 38.6, 38.7]
    }
  }
};
