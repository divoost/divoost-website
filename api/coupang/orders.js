const fetch = require('node-fetch');
const { getCoupangHeaders } = require('../lib/coupang-auth');

const BASE_URL = 'https://api-gateway.coupang.com';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { status = 'ACCEPT', page = 1, limit = 50 } = req.query;
  const vendorId = process.env.COUPANG_VENDOR_ID;

  if (!vendorId) {
    return res.status(400).json({ error: 'COUPANG_VENDOR_ID 환경변수가 필요합니다' });
  }

  try {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets?status=${status}&maxPerPage=${limit}&currentPage=${page}`;
    const url = BASE_URL + path;
    const headers = getCoupangHeaders('GET', url);

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (data.code === 'ERROR') {
      return res.status(502).json({ error: '쿠팡 API 오류', detail: data.message });
    }

    const orders = (data.data || []).map(o => ({
      orderId: o.orderId,
      productName: o.sellerProductName,
      quantity: o.shippingCount,
      price: o.orderPrice,
      status: o.status,
      orderedAt: o.orderedAt,
      buyer: o.receiver?.name || ''
    }));

    res.status(200).json({
      success: true,
      total: orders.length,
      orders
    });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
