const fetch = require('node-fetch');
const { getCoupangHeaders } = require('../lib/coupang-auth');

const BASE_URL = 'https://api-gateway.coupang.com';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, limit = 20, subId } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' });
  }

  try {
    const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}${subId ? `&subId=${subId}` : ''}`;
    const url = BASE_URL + path;
    const headers = getCoupangHeaders('GET', url);

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (data.rCode !== 200 && data.rCode !== '200') {
      return res.status(502).json({ error: '쿠팡 API 오류', detail: data.rMessage || data });
    }

    const products = (data.data?.productData || []).map(p => ({
      id: p.productId,
      name: p.productName,
      price: p.productPrice,
      originalPrice: p.productPrice,
      category: p.categoryName,
      image: p.productImage,
      url: p.productUrl,
      isRocket: p.isRocket || false,
      isFreeShipping: p.isFreeShipping || false,
      rating: p.productRating || 0,
      reviewCount: p.reviewCount || 0,
      rank: p.rank || 0,
      platform: '쿠팡'
    }));

    res.status(200).json({
      success: true,
      keyword,
      total: products.length,
      products
    });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
