const fetch = require('node-fetch');
const { getCached, setCache, checkRateLimit } = require('../lib/scrape-utils');

var SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  var keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  var cacheKey = 'cp_' + keyword;
  var cached = getCached(cacheKey);
  if (cached) return res.status(200).json(cached);

  if (!checkRateLimit('coupang')) {
    return res.status(429).json({ error: '요청 제한', retryAfter: 60 });
  }

  try {
    var targetUrl = 'https://www.coupang.com/np/search?component=&q=' + encodeURIComponent(keyword) + '&channel=user';
    var fetchUrl;

    if (SCRAPER_API_KEY) {
      fetchUrl = 'https://api.scraperapi.com?api_key=' + SCRAPER_API_KEY + '&url=' + encodeURIComponent(targetUrl) + '&country_code=kr&render=false';
    } else {
      fetchUrl = targetUrl;
    }

    var r = await fetch(fetchUrl, {
      headers: SCRAPER_API_KEY ? {} : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      },
      timeout: 30000
    });

    if (!r || r.status === 403 || r.status === 429 || r.status === 500) {
      return res.status(200).json({ success: true, keyword: keyword, total: 0, products: [], blocked: true, message: SCRAPER_API_KEY ? '프록시 실패' : '직접 접근 차단됨 - ScraperAPI 키를 설정하세요' });
    }

    var html = await r.text();
    if (html.length < 1000 || html.indexOf('search-product') === -1) {
      return res.status(200).json({ success: true, keyword: keyword, total: 0, products: [], blocked: true, message: '차단됨 (응답 길이: ' + html.length + ')' });
    }

    var products = [];
    var regex = /<li[^>]*class="[^"]*search-product[^"]*"[^>]*>[\s\S]*?<\/li>/gi;
    var matches = html.match(regex) || [];

    for (var i = 0; i < Math.min(matches.length, 20); i++) {
      var item = matches[i];
      var nameMatch = item.match(/class="name"[^>]*>([\s\S]*?)<\//);
      var priceMatch = item.match(/class="price-value"[^>]*>([\s\S]*?)<\//);
      var ratingMatch = item.match(/class="rating"[^>]*>([\s\S]*?)<\//);
      var reviewMatch = item.match(/class="rating-total-count"[^>]*>\(?([\d,]+)\)?<\//);
      var imgMatch = item.match(/src="(https?:\/\/[^"]*thumbnail[^"]*)"/i) || item.match(/data-img-src="([^"]*)"/);
      var linkMatch = item.match(/href="(\/vp\/products\/\d+[^"]*)"/);
      var rocketMatch = item.match(/rocket/i);

      if (nameMatch) {
        products.push({
          name: nameMatch[1].replace(/<[^>]*>/g, '').trim(),
          price: priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, '')) || 0 : 0,
          rating: ratingMatch ? parseFloat(ratingMatch[1]) || 0 : 0,
          reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(/[^\d]/g, '')) || 0 : 0,
          image: imgMatch ? imgMatch[1] : '',
          url: linkMatch ? 'https://www.coupang.com' + linkMatch[1] : '',
          isRocket: !!rocketMatch,
          platform: '쿠팡',
          source: SCRAPER_API_KEY ? 'proxy' : 'scraping'
        });
      }
    }

    var result = { success: true, keyword: keyword, total: products.length, products: products, source: SCRAPER_API_KEY ? 'proxy' : 'scraping', scrapedAt: new Date().toISOString() };
    if (products.length > 0) setCache(cacheKey, result);
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ success: true, keyword: keyword, total: 0, products: [], blocked: true, message: e.message });
  }
};
