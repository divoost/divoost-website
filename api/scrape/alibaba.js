const fetch = require('node-fetch');
const { getCached, setCache, checkRateLimit } = require('../lib/scrape-utils');

var SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  var keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  var cacheKey = 'a1_' + keyword;
  var cached = getCached(cacheKey);
  if (cached) return res.status(200).json(cached);

  if (!checkRateLimit('alibaba')) {
    return res.status(429).json({ error: '요청 제한', retryAfter: 60 });
  }

  try {
    var targetUrl = 'https://s.1688.com/selloffer/offer_search.htm?keywords=' + encodeURIComponent(keyword) + '&n=y&netType=1';
    var fetchUrl;

    if (SCRAPER_API_KEY) {
      fetchUrl = 'https://api.scraperapi.com?api_key=' + SCRAPER_API_KEY + '&url=' + encodeURIComponent(targetUrl) + '&render=false';
    } else {
      fetchUrl = targetUrl;
    }

    var r = await fetch(fetchUrl, {
      headers: SCRAPER_API_KEY ? {} : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout: 30000
    });

    if (!r || r.status === 403 || r.status === 429 || r.status === 500) {
      return res.status(200).json({ success: true, keyword: keyword, total: 0, products: [], blocked: true, message: SCRAPER_API_KEY ? '프록시 실패' : '직접 접근 차단됨' });
    }

    var html = await r.text();
    var products = [];

    var jsonMatch = html.match(/var\s+__INIT_DATA\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (jsonMatch) {
      try {
        var initData = JSON.parse(jsonMatch[1]);
        var offerList = (initData.data && initData.data.offerList) || [];
        for (var i = 0; i < Math.min(offerList.length, 20); i++) {
          var item = offerList[i];
          var priceStr = (item.tradePrice && item.tradePrice.offerPrice && item.tradePrice.offerPrice.valueString) || '0';
          products.push({
            name: (item.information && item.information.subject) || '',
            price: priceStr,
            unit: 'CNY',
            priceKRW: Math.round(parseFloat(priceStr) * 190.5),
            image: (item.image && item.image.imgUrl) || '',
            url: 'https://detail.1688.com/offer/' + (item.id || '') + '.html',
            tradeQuantity: (item.tradeQuantity && item.tradeQuantity.number) || 0,
            supplierName: (item.sellerIdentity && item.sellerIdentity.memberName) || '',
            platform: '1688',
            source: SCRAPER_API_KEY ? 'proxy' : 'scraping'
          });
        }
      } catch (pe) {}
    }

    if (products.length === 0) {
      var titleRegex = /<a[^>]*title="([^"]{3,})"[^>]*href="[^"]*detail\.1688\.com[^"]*"[^>]*>/gi;
      var m; var count = 0;
      while ((m = titleRegex.exec(html)) !== null && count < 20) {
        products.push({ name: m[1].trim(), price: '0', unit: 'CNY', platform: '1688', source: 'scraping' });
        count++;
      }
    }

    var result = { success: true, keyword: keyword, total: products.length, products: products, source: SCRAPER_API_KEY ? 'proxy' : 'scraping', scrapedAt: new Date().toISOString() };
    if (products.length > 0) setCache(cacheKey, result);
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ success: true, keyword: keyword, total: 0, products: [], blocked: true, message: e.message });
  }
};
