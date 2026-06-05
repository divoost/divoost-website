const fetch = require('node-fetch');
const { getCached, setCache, checkRateLimit } = require('../lib/scrape-utils');

var SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';

// ScraperAPI의 Google Shopping structured 엔드포인트를 서버에서 호출한다.
// 키는 환경변수에만 두고, 결과는 프론트가 바로 쓸 수 있는 형태로 정규화한다.
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var query = req.query.query;
  if (!query) return res.status(400).json({ success: false, error: 'query 필요', products: [] });

  if (!SCRAPER_API_KEY) {
    return res.status(200).json({ success: false, error: 'SCRAPER_API_KEY 미설정 (서버 환경변수 확인)', products: [], total: 0 });
  }

  var country = req.query.country || 'kr';
  var num = parseInt(req.query.num, 10) || 30;

  var cacheKey = 'shop_' + country + '_' + query;
  var cached = getCached(cacheKey);
  if (cached) return res.status(200).json(cached);

  if (!checkRateLimit('shopping')) {
    return res.status(429).json({ success: false, error: '요청 제한', retryAfter: 60, products: [] });
  }

  try {
    var apiUrl = 'https://api.scraperapi.com/structured/google/shopping?api_key=' + SCRAPER_API_KEY +
      '&query=' + encodeURIComponent(query) +
      '&country=' + encodeURIComponent(country) +
      '&num=' + num;

    var r = await fetch(apiUrl, { timeout: 30000 });

    if (!r || r.status === 403 || r.status === 429 || r.status === 500) {
      return res.status(200).json({ success: false, error: '프록시 실패 (status ' + (r ? r.status : 'no-response') + ')', products: [], total: 0 });
    }

    var data = await r.json();
    var items = data.shopping_results || data.results || [];

    var products = items.map(function (it) {
      var price = it.extracted_price || 0;
      if (typeof price === 'string') price = parseFloat(price.replace(/[^\d.]/g, '')) || 0;
      return {
        name: it.title || '',
        price: price,
        image: it.thumbnail || '',
        url: it.link || '',
        platform: it.source || '',
        rating: it.rating || 0,
        reviewCount: it.reviews || 0,
        source: 'scraper'
      };
    });

    // products: 정규화된 형태 / shopping_results·related_searches: 원본 패스스루(기존 프론트 호환)
    var result = { success: true, query: query, total: products.length, products: products, shopping_results: items, related_searches: data.related_searches || [], scrapedAt: new Date().toISOString() };
    if (products.length > 0) setCache(cacheKey, result);
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ success: false, error: e.message, products: [], total: 0 });
  }
};
