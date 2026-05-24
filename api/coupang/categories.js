const fetch = require('node-fetch');
const { getCoupangHeaders } = require('../lib/coupang-auth');

const BASE_URL = 'https://api-gateway.coupang.com';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const path = '/v2/providers/affiliate_open_api/apis/openapi/deeplink/categories';
    const url = BASE_URL + path;
    const headers = getCoupangHeaders('GET', url);

    const response = await fetch(url, { headers });
    const data = await response.json();

    res.status(200).json({
      success: true,
      categories: data.data || data
    });
  } catch (err) {
    res.status(500).json({ error: 'API 호출 실패', message: err.message });
  }
};
