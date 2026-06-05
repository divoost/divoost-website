var API_BASE = location.hostname.indexOf('github.io') !== -1 ? 'https://divoost-website.vercel.app' : '';

var API = {
  base: API_BASE,

  async coupangSearch(keyword, limit) {
    limit = limit || 20;
    try {
      var res = await fetch(this.base + '/api/scrape/coupang?keyword=' + encodeURIComponent(keyword));
      return res.json();
    } catch(e) {
      return { success: false, error: e.message, products: [] };
    }
  },

  async alibaba1688Search(keyword) {
    try {
      var res = await fetch(this.base + '/api/scrape/alibaba?keyword=' + encodeURIComponent(keyword));
      return res.json();
    } catch(e) {
      return { success: false, error: e.message, products: [] };
    }
  },

  // Google Shopping 기반 다중 플랫폼 검색 (ScraperAPI 키는 백엔드에서만 사용)
  async shoppingSearch(query, country, num) {
    try {
      var url = this.base + '/api/scrape/shopping?query=' + encodeURIComponent(query) +
        '&country=' + encodeURIComponent(country || 'kr') +
        '&num=' + (num || 30);
      var res = await fetch(url);
      return res.json();
    } catch(e) {
      return { success: false, error: e.message, products: [] };
    }
  },

  async compare(keyword, keyword1688) {
    var results = { coupang: null, alibaba: null };
    try {
      var cp = await this.coupangSearch(keyword);
      results.coupang = cp;
    } catch(e) {}
    try {
      var a1 = await this.alibaba1688Search(keyword1688 || keyword);
      results.alibaba = a1;
    } catch(e) {}
    return {
      success: true,
      coupang: { count: results.coupang ? results.coupang.total : 0, products: results.coupang ? results.coupang.products : [] },
      alibaba1688: { count: results.alibaba ? results.alibaba.total : 0, products: results.alibaba ? results.alibaba.products : [] }
    };
  },

  async healthCheck() {
    try {
      var res = await fetch(this.base + '/api/health');
      return res.json();
    } catch(e) {
      return { status: 'offline' };
    }
  }
};
