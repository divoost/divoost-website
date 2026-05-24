const fetch = require('node-fetch');
const { getCoupangHeaders } = require('./lib/coupang-auth');
const { get1688Params } = require('./lib/alibaba-auth');

const COUPANG_BASE = 'https://api-gateway.coupang.com';
const ALIBABA_BASE = 'https://gw.open.1688.com/openapi';
const EXCHANGE_RATE_CNY_KRW = 190.5;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, keyword1688, limit = 10 } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' });
  }

  const chinaKeyword = keyword1688 || keyword;

  try {
    const [coupangResult, alibabaResult] = await Promise.allSettled([
      fetchCoupang(keyword, limit),
      fetch1688(chinaKeyword, limit)
    ]);

    const coupang = coupangResult.status === 'fulfilled' ? coupangResult.value : [];
    const alibaba = alibabaResult.status === 'fulfilled' ? alibabaResult.value : [];

    const comparison = {
      keyword,
      keyword1688: chinaKeyword,
      exchangeRate: EXCHANGE_RATE_CNY_KRW,
      fetchedAt: new Date().toISOString(),
      coupang: {
        count: coupang.length,
        products: coupang,
        avgPrice: coupang.length ? Math.round(coupang.reduce((s, p) => s + p.price, 0) / coupang.length) : 0,
        error: coupangResult.status === 'rejected' ? coupangResult.reason.message : null
      },
      alibaba1688: {
        count: alibaba.length,
        products: alibaba,
        avgPrice: alibaba.length ? (alibaba.reduce((s, p) => s + p.price, 0) / alibaba.length).toFixed(1) : 0,
        avgPriceKRW: alibaba.length ? Math.round(alibaba.reduce((s, p) => s + p.price, 0) / alibaba.length * EXCHANGE_RATE_CNY_KRW) : 0,
        error: alibabaResult.status === 'rejected' ? alibabaResult.reason.message : null
      }
    };

    if (coupang.length > 0 && alibaba.length > 0) {
      const avgCoupang = comparison.coupang.avgPrice;
      const avgCostKRW = comparison.alibaba1688.avgPriceKRW + 2000;
      comparison.estimatedMargin = {
        avgSellPrice: avgCoupang,
        avgCostKRW: avgCostKRW,
        avgProfit: avgCoupang - avgCostKRW,
        avgMarginPct: ((avgCoupang - avgCostKRW) / avgCoupang * 100).toFixed(1)
      };
    }

    res.status(200).json({ success: true, ...comparison });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};

async function fetchCoupang(keyword, limit) {
  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const url = COUPANG_BASE + path;
  const headers = getCoupangHeaders('GET', url);
  const response = await fetch(url, { headers });
  const data = await response.json();
  return (data.data?.productData || []).map(p => ({
    id: p.productId,
    name: p.productName,
    price: p.productPrice,
    image: p.productImage,
    url: p.productUrl,
    isRocket: p.isRocket || false,
    rating: p.productRating || 0,
    reviewCount: p.reviewCount || 0,
    platform: '쿠팡'
  }));
}

async function fetch1688(keyword, limit) {
  const apiMethod = 'com.alibaba.product.search';
  const params = get1688Params(apiMethod, {
    keyword: keyword,
    pageSize: String(limit)
  });
  const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${ALIBABA_BASE}/param2/1/${apiMethod}/${process.env.ALIBABA_APP_KEY}?${queryStr}`;
  const response = await fetch(url);
  const data = await response.json();
  return (data.result?.toReturn || []).map(p => ({
    id: p.offerId,
    name: p.subject,
    price: p.priceInfo?.price || 0,
    image: p.imageUrl,
    url: `https://detail.1688.com/offer/${p.offerId}.html`,
    tradeQuantity: p.tradeQuantity || 0,
    platform: '1688'
  }));
}
