const fetch = require('node-fetch');
const { getCoupangHeaders } = require('../lib/coupang-auth');

const BASE_URL = 'https://api-gateway.coupang.com';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { limit = 50, debug } = req.query;
  const vendorId = process.env.COUPANG_VENDOR_ID;

  if (!vendorId) {
    return res.status(400).json({ error: 'COUPANG_VENDOR_ID 환경변수가 필요합니다. Vercel Settings에서 추가하세요.' });
  }

  try {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products?vendorId=${vendorId}&maxPerPage=${limit}`;
    const url = BASE_URL + path;
    const headers = getCoupangHeaders('GET', url);

    const response = await fetch(url, { headers });
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: '응답 파싱 실패', body: text.substring(0, 500) });
    }

    if (debug === 'true') {
      return res.status(200).json({ raw: data });
    }

    const productList = data.data || [];
    const products = (Array.isArray(productList) ? productList : []).map(p => ({
      id: p.sellerProductId || p.productId,
      name: p.sellerProductName || p.productName,
      price: p.salePrice || p.originalPrice || 0,
      category: p.displayCategoryName || '',
      status: p.statusName || '',
      platform: '쿠팡'
    }));

    res.status(200).json({
      success: true,
      total: products.length,
      products
    });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
