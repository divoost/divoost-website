const fetch = require('node-fetch');
const { randomUA, randomDelay, getCached, setCache, checkRateLimit } = require('../lib/scrape-utils');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  var keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  var cacheKey = 'a1_' + keyword;
  var cached = getCached(cacheKey);
  if (cached) return res.status(200).json(cached);

  if (!checkRateLimit('alibaba')) {
    return res.status(429).json({ error: '요청 제한', message: '1688 요청이 너무 많습니다. 1분 후 다시 시도하세요.', retryAfter: 60 });
  }

  try {
    await randomDelay(2000, 4000);

    var url = 'https://s.1688.com/selloffer/offer_search.htm?keywords=' + encodeURIComponent(keyword) + '&n=y&netType=1';
    var r = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      timeout: 10000
    });

    if (r.status === 403 || r.status === 429) {
      return res.status(200).json({ success: true, keyword: keyword, total: 0, products: [], source: 'scraping', blocked: true, message: '1688 차단됨 - 잠시 후 재시도' });
    }

    var html = await r.text();
    var products = [];

    var jsonMatch = html.match(/var\s+__INIT_DATA\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (jsonMatch) {
      try {
        var initData = JSON.parse(jsonMatch[1]);
        var offerList = (initData.data && initData.data.offerList) || [];
        for (var i = 0; i < Math.min(offerList.length, 10); i++) {
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
            source: 'scraping'
          });
        }
      } catch (pe) {}
    }

    if (products.length === 0) {
      var titleRegex = /<a[^>]*title="([^"]{3,})"[^>]*href="[^"]*detail\.1688\.com[^"]*"[^>]*>/gi;
      var m;
      var count = 0;
      while ((m = titleRegex.exec(html)) !== null && count < 10) {
        products.push({ name: m[1].trim(), price: '0', unit: 'CNY', platform: '1688', source: 'scraping' });
        count++;
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
