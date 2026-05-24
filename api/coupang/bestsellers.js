const fetch = require('node-fetch');
const { getCoupangHeaders } = require('../lib/coupang-auth');

const BASE_URL = 'https://api-gateway.coupang.com';

const CATEGORIES = [
  { id: '주방용품', keywords: ['실리콘 주방용품', '스테인리스 밀폐용기', '주방 수납'] },
  { id: '전자기기', keywords: ['블루투스 이어폰', 'USB-C 충전 케이블', '무선 충전기'] },
  { id: '홈인테리어', keywords: ['LED 무드등', '인테리어 소품', '수납 정리함'] },
  { id: '뷰티도구', keywords: ['메이크업 브러쉬', '뷰티 도구 세트', '화장품 정리대'] },
  { id: '패션잡화', keywords: ['에코백', '캔버스 토트백', '미니 크로스백'] },
  { id: '반려동물', keywords: ['강아지 장난감', '고양이 스크래처', '반려동물 용품'] },
  { id: '유아/아동', keywords: ['몬테소리 교구', '유아 퍼즐', '아기 장난감'] },
  { id: '스포츠', keywords: ['요가매트', '홈트레이닝', '운동 용품'] },
  { id: '자동차용품', keywords: ['차량용 수납', '자동차 용품', '차량 정리함'] },
  { id: '문구/사무', keywords: ['다이어리', '사무용품', '필기구 세트'] }
];

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { category, limit = 10 } = req.query;

  try {
    let searchCategories = CATEGORIES;
    if (category) {
      searchCategories = CATEGORIES.filter(c => c.id === category);
      if (searchCategories.length === 0) {
        return res.status(400).json({ error: `카테고리를 찾을 수 없습니다: ${category}` });
      }
    }

    const results = {};

    for (const cat of searchCategories) {
      const keyword = cat.keywords[0];
      const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
      const url = BASE_URL + path;
      const headers = getCoupangHeaders('GET', url);

      const response = await fetch(url, { headers });
      const data = await response.json();

      results[cat.id] = (data.data?.productData || []).map(p => ({
        id: p.productId,
        name: p.productName,
        price: p.productPrice,
        category: cat.id,
        image: p.productImage,
        url: p.productUrl,
        isRocket: p.isRocket || false,
        rating: p.productRating || 0,
        reviewCount: p.reviewCount || 0,
        platform: '쿠팡'
      }));
    }

    res.status(200).json({
      success: true,
      fetchedAt: new Date().toISOString(),
      results
    });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
