const fetch = require('node-fetch');
const { get1688Params } = require('../lib/alibaba-auth');

const BASE_URL = 'https://gw.open.1688.com/openapi';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { offerId } = req.query;

  if (!offerId) {
    return res.status(400).json({ error: 'offerId 파라미터가 필요합니다' });
  }

  try {
    const apiMethod = 'com.alibaba.product.get';
    const params = get1688Params(apiMethod, {
      productId: offerId
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

    const p = data.result?.result || {};
    const product = {
      id: p.productID,
      name: p.subject,
      description: p.description,
      price: p.referencePrice,
      priceRanges: p.productInfo?.priceRangeList || [],
      unit: 'CNY',
      minOrder: p.minOrderQuantity,
      images: p.image?.images || [],
      supplierName: p.supplierLoginId,
      attributes: p.productInfo?.attributes || [],
      shippingInfo: p.shippingInfo || {},
      tradeInfo: {
        tradeQuantity: p.tradeQuantity || 0,
        favoriteCount: p.favoriteCount || 0
      },
      platform: '1688'
    };

    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
