const fetch = require('node-fetch');
const { getCoupangHeaders } = require('../lib/coupang-auth');

const BASE_URL = 'https://api-gateway.coupang.com';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, limit = 20, debug } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' });
  }

  try {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products?vendorId=${process.env.COUPANG_VENDOR_ID || ''}&searchKeyword=${encodeURIComponent(keyword)}&maxPerPage=${limit}`;
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

    if (data.code === 'ERROR') {
      return res.status(502).json({ error: '쿠팡 API 오류', detail: data.message });
    }

    const productList = data.data || [];
    const products = (Array.isArray(productList) ? productList : []).map(p => ({
      id: p.sellerProductId || p.productId,
      name: p.sellerProductName || p.productName || p.displayProductName,
      price: p.salePrice || p.originalPrice || 0,
      originalPrice: p.originalPrice || 0,
      category: p.displayCategoryName || '',
      image: p.productImageUrl || '',
      status: p.statusName || p.saleStatus || '',
      stockQuantity: p.stockQuantity || 0,
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
