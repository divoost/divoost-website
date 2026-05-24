const crypto = require('crypto');

function generateHmac(method, url, secretKey, accessKey) {
  const parts = new URL(url);
  const path = parts.pathname + parts.search;
  const datetime = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

  const message = datetime + method.toUpperCase() + path;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

function getCoupangHeaders(method, url) {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('COUPANG_ACCESS_KEY and COUPANG_SECRET_KEY must be set');
  }

  return {
    'Authorization': generateHmac(method, url, secretKey, accessKey),
    'Content-Type': 'application/json;charset=UTF-8'
  };
}

module.exports = { getCoupangHeaders };
