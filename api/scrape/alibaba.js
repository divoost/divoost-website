const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  var keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  try {
    var url = 'https://s.1688.com/selloffer/offer_search.htm?keywords=' + encodeURIComponent(keyword) + '&n=y&netType=1&spm=a26352.13672862.searchbox.input';
    var r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.1688.com/'
      },
      redirect: 'follow'
    });
    var html = await r.text();

    var products = [];

    var jsonMatch = html.match(/var\s+__INIT_DATA\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (jsonMatch) {
      try {
        var initData = JSON.parse(jsonMatch[1]);
        var offerList = initData.data && initData.data.offerList || [];
        for (var i = 0; i < Math.min(offerList.length, 20); i++) {
          var item = offerList[i];
          products.push({
            name: item.information && item.information.subject || '',
            price: item.tradePrice && item.tradePrice.offerPrice && item.tradePrice.offerPrice.valueString || '0',
            unit: 'CNY',
            priceKRW: Math.round((parseFloat(item.tradePrice && item.tradePrice.offerPrice && item.tradePrice.offerPrice.valueString || '0')) * 190.5),
            image: item.image && item.image.imgUrl || '',
            url: 'https://detail.1688.com/offer/' + (item.id || '') + '.html',
            tradeQuantity: item.tradeQuantity && item.tradeQuantity.number || 0,
            supplierName: item.sellerIdentity && item.sellerIdentity.memberName || '',
            platform: '1688',
            source: 'scraping'
          });
        }
      } catch (pe) {}
    }

    if (products.length === 0) {
      var titleRegex = /<a[^>]*class="[^"]*offer-title[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      var priceRegex = /<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d.]+)<\/span>/gi;
      var titleMatches = html.match(titleRegex) || [];

      for (var j = 0; j < Math.min(titleMatches.length, 20); j++) {
        var nameM = titleMatches[j].match(/>([^<]+)</);
        products.push({
          name: nameM ? nameM[1].replace(/<[^>]*>/g, '').trim() : 'Unknown',
          price: '0',
          unit: 'CNY',
          platform: '1688',
          source: 'scraping'
        });
      }
    }

    res.status(200).json({
      success: true,
      keyword: keyword,
      total: products.length,
      products: products,
      source: 'scraping',
      scrapedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: '스크래핑 실패', message: e.message });
  }
};
