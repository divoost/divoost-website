const fetch = require('node-fetch');
const { getCached, setCache, checkRateLimit } = require('../lib/scrape-utils');

var SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';

// ScraperAPI의 Google Search structured 엔드포인트를 서버에서 호출한다.
// 소셜 리스닝(언급 검색)용. 키는 환경변수에만 둔다.
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var query = req.query.query;
  if (!query) return res.status(400).json({ success: false, error: 'query 필요', organic_results: [] });

  if (!SCRAPER_API_KEY) {
    return res.status(200).json({ success: false, error: 'SCRAPER_API_KEY 미설정 (서버 환경변수 확인)', organic_results: [] });
  }

  var country = req.query.country || 'kr';
  var num = parseInt(req.query.num, 10) || 20;

  var cacheKey = 'gsearch_' + country + '_' + query;
  var cached = getCached(cacheKey);
  if (cached) return res.status(200).json(cached);

  if (!checkRateLimit('websearch')) {
    return res.status(429).json({ success: false, error: '요청 제한', retryAfter: 60, organic_results: [] });
  }

  try {
    var apiUrl = 'https://api.scraperapi.com/structured/google/search?api_key=' + SCRAPER_API_KEY +
      '&query=' + encodeURIComponent(query) +
      '&country=' + encodeURIComponent(country) +
      '&num=' + num;

    var r = await fetch(apiUrl, { timeout: 30000 });

    if (!r || r.status === 403 || r.status === 429 || r.status === 500) {
      return res.status(200).json({ success: false, error: '프록시 실패 (status ' + (r ? r.status : 'no-response') + ')', organic_results: [] });
    }

    var data = await r.json();
    var organic = data.organic_results || [];

    var result = { success: true, query: query, total: organic.length, organic_results: organic, scrapedAt: new Date().toISOString() };
    if (organic.length > 0) setCache(cacheKey, result);
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ success: false, error: e.message, organic_results: [] });
  }
};
