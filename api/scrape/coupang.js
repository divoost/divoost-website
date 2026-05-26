const fetch = require('node-fetch');
const { randomUA, randomDelay, getCached, setCache, checkRateLimit } = require('../lib/scrape-utils');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  var keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  var cacheKey = 'cp_' + keyword;
  var cached = getCached(cacheKey);
  if (cached) return res.status(200).json(cached);

  if (!checkRateLimit('coupang')) {
    return res.status(429).json({ error: '요청 제한', message: '쿠팡 요청이 너무 많습니다. 1분 후 다시 시도하세요.', retryAfter: 60 });
  }

  try {
    await randomDelay(1000, 3000);

    var url = 'https://www.coupang.com/np/search?component=&q=' + encodeURIComponent(keyword) + '&channel=user';
    var r = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      timeout: 10000
    });

    if (r.status === 403 || r.status === 429) {
      return res.status(200).json({ success: true, keyword: keyword, total: 0, products: [], source: 'scraping', blocked: true, message: '쿠팡 차단됨 - 잠시 후 재시도' });
    }

    var html = await r.text();
    var products = [];
    var regex = /<li[^>]*class="[^"]*search-product[^"]*"[^>]*>[\s\S]*?<\/li>/gi;
    var matches = html.match(regex) || [];

    for (var i = 0; i < Math.min(matches.length, 10); i++) {
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
          source: 'scraping'
        });
      }
    }

    var result = {
      success: true,
      keyword: keyword,
      total: products.length,
      products: products,
      source: 'scraping',
      scrapedAt: new Date().toISOString()
    };

    if (products.length > 0) setCache(cacheKey, result);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: '스크래핑 실패', message: e.message });
  }
};
