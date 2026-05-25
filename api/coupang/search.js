const fetch = require('node-fetch');
const { getCoupangHeaders } = require('../lib/coupang-auth');

const BASE_URL = 'https://api-gateway.coupang.com';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, limit = 20, subId, debug } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' });
  }

  try {
    const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}${subId ? `&subId=${subId}` : ''}`;
    const url = BASE_URL + path;
    const headers = getCoupangHeaders('GET', url);

    const response = await fetch(url, { headers });
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: '쿠팡 응답 파싱 실패', status: response.status, body: text.substring(0, 1000) });
    }

    if (debug === 'true') {
      return res.status(200).json({ raw: data });
    }

    const productData = data.data?.productData
      || data.data?.products
      || data.productData
      || data.products
      || data.data
      || [];

    const productList = Array.isArray(productData) ? productData : [];

    const products = productList.map(p => ({
      id: p.productId || p.id,
      name: p.productName || p.name || p.title,
      price: p.productPrice || p.salePrice || p.price,
      originalPrice: p.originalPrice || p.productPrice || p.price,
      category: p.categoryName || p.category,
      image: p.productImage || p.imageUrl || p.image,
      url: p.productUrl || p.url || p.landingUrl,
      isRocket: p.isRocket || p.rocketDelivery || false,
      isFreeShipping: p.isFreeShipping || p.freeShipping || false,
      rating: p.productRating || p.rating || 0,
      reviewCount: p.reviewCount || p.totalReviewCount || 0,
      rank: p.rank || 0,
      platform: '쿠팡'
    }));

    const result = {
      success: true,
      keyword,
      total: products.length,
      products
    };

    if (products.length === 0) {
      result._debug = {
        httpStatus: response.status,
        responseKeys: Object.keys(data),
        rCode: data.rCode,
        rMessage: data.rMessage,
        dataKeys: data.data ? Object.keys(data.data) : null,
        sampleData: JSON.stringify(data).substring(0, 500)
      };
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
