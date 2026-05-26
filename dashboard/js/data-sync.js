var DataSync = {
  getProducts: function() {
    var crawled = JSON.parse(localStorage.getItem('crawlProducts') || '[]');
    return crawled.length > 0 ? crawled : null;
  },

  getSource: function() {
    var crawled = this.getProducts();
    return crawled ? 'crawl' : 'sample';
  },

  getLastUpdate: function() {
    var results = JSON.parse(localStorage.getItem('crawlResults2') || 'null');
    return results ? new Date(results.timestamp).toLocaleString('ko-KR') : null;
  },

  getByPlatform: function(platform) {
    var products = this.getProducts();
    if (!products) return [];
    return products.filter(function(p) { return p.platform === platform; });
  },

  getStats: function() {
    var products = this.getProducts();
    if (!products || products.length === 0) return null;
    var platforms = {};
    products.forEach(function(p) {
      var plat = p.platform || 'unknown';
      if (!platforms[plat]) platforms[plat] = { count: 0, totalPrice: 0, withPrice: 0 };
      platforms[plat].count++;
      var price = parseFloat(p.price) || 0;
      if (price > 0) { platforms[plat].totalPrice += price; platforms[plat].withPrice++; }
    });
    Object.keys(platforms).forEach(function(k) {
      platforms[k].avgPrice = platforms[k].withPrice > 0 ? Math.round(platforms[k].totalPrice / platforms[k].withPrice) : 0;
    });
    return { total: products.length, platforms: platforms, source: 'crawl', lastUpdate: this.getLastUpdate() };
  },

  getTopProducts: function(sortBy, limit) {
    var products = this.getProducts();
    if (!products) return [];
    sortBy = sortBy || 'reviewCount';
    limit = limit || 20;
    return products.filter(function(p) { return p.name && p.name.length > 0; })
      .sort(function(a, b) { return (parseFloat(b[sortBy]) || 0) - (parseFloat(a[sortBy]) || 0); })
      .slice(0, limit);
  },

  getPlatformComparison: function() {
    var products = this.getProducts();
    if (!products) return null;
    var result = {};
    products.forEach(function(p) {
      var plat = p.platform || 'unknown';
      if (!result[plat]) result[plat] = { products: [], count: 0, avgPrice: 0, totalPrice: 0, withPrice: 0 };
      result[plat].products.push(p);
      result[plat].count++;
      var price = parseFloat(p.price) || 0;
      if (price > 0) { result[plat].totalPrice += price; result[plat].withPrice++; }
    });
    Object.keys(result).forEach(function(k) {
      result[k].avgPrice = result[k].withPrice > 0 ? Math.round(result[k].totalPrice / result[k].withPrice) : 0;
    });
    return result;
  },

  injectSourceBadge: function(containerId) {
    var source = this.getSource();
    var container = document.getElementById(containerId);
    if (!container) return;
    var labels = { sample: '📋 샘플 데이터', crawl: '🕷 스크래핑 데이터', live: '🔌 API 실시간' };
    var colors = { sample: 'rgba(249,115,22,.15)', crawl: 'rgba(139,92,246,.15)', live: 'rgba(16,185,129,.15)' };
    var textColors = { sample: '#fb923c', crawl: '#a78bfa', live: '#34d399' };
    container.innerHTML = '<span style="padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600;background:' + colors[source] + ';color:' + textColors[source] + '">' + labels[source] + '</span>';
    if (source === 'crawl') {
      var lastUpdate = this.getLastUpdate();
      if (lastUpdate) container.innerHTML += '<span style="font-size:.7rem;color:#64748b;margin-left:8px">' + lastUpdate + '</span>';
    }
  }
};
