const fetch = require('node-fetch');
const { get1688Params } = require('../lib/alibaba-auth');

const BASE_URL = 'https://gw.open.1688.com/openapi';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, page = 1, pageSize = 20 } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' });
  }

  try {
    const apiMethod = 'com.alibaba.product.search';
    const params = get1688Params(apiMethod, {
      keyword: keyword,
      page: String(page),
      pageSize: String(pageSize)
    });

    const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `${BASE_URL}/param2/1/${apiMethod}/${process.env.ALIBABA_APP_KEY}?${queryStr}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error_response) {
      return res.status(502).json({
        error: '1688 API 오류',
        code: data.error_response.error_code,
        message: data.error_response.error_message
      });
    }

    const products = (data.result?.toReturn || []).map(p => ({
      id: p.offerId,
      name: p.subject,
      price: p.priceInfo?.price || 0,
      priceRange: p.priceInfo?.priceRange || '',
      unit: 'CNY',
      minOrder: p.minOrderQuantity || 1,
      image: p.imageUrl,
      supplierName: p.supplierLoginId,
      supplierUrl: p.supplierUrl,
      productUrl: `https://detail.1688.com/offer/${p.offerId}.html`,
      tradeQuantity: p.tradeQuantity || 0,
      badges: p.tags || [],
      platform: '1688'
    }));

    res.status(200).json({
      success: true,
      keyword,
      page: parseInt(page),
      total: data.result?.totalCount || products.length,
      products
    });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
