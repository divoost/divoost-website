const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  var keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  try {
    var url = 'https://www.coupang.com/np/search?component=&q=' + encodeURIComponent(keyword) + '&channel=user';
    var r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://www.coupang.com/'
      },
      redirect: 'follow'
    });
    var html = await r.text();

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
