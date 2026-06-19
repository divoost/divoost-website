const crypto = require('crypto');

function generateSign(params, appSecret) {
  const sorted = Object.keys(params).sort();
  let str = appSecret;
  sorted.forEach(key => {
    str += key + params[key];
  });
  str += appSecret;

  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
}

function get1688Params(apiMethod, bizParams = {}) {
  const appKey = process.env.ALIBABA_APP_KEY;
  const appSecret = process.env.ALIBABA_APP_SECRET;
  const accessToken = process.env.ALIBABA_ACCESS_TOKEN;

  if (!appKey || !appSecret) {
    throw new Error('ALIBABA_APP_KEY and ALIBABA_APP_SECRET must be set');
  }

  const params = {
    method: apiMethod,
    app_key: appKey,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    format: 'json',
    v: '2',
    sign_method: 'md5',
    ...bizParams
  };

  if (accessToken) {
    params.access_token = accessToken;
  }

  params.sign = generateSign(params, appSecret);

  return params;
}

module.exports = { get1688Params };
