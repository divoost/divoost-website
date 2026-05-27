var SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
var SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

var DB = {
  headers: function() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  async query(table, params) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    if (params) url += '?' + params;
    var r = await fetch(url, { headers: this.headers() });
    return r.json();
  },

  async insert(table, data) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    var r = await fetch(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(data) });
    return r.json();
  },

  async update(table, id, data) {
    var url = SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id;
    var r = await fetch(url, { method: 'PATCH', headers: this.headers(), body: JSON.stringify(data) });
    return r.json();
  },

  async remove(table, id) {
    var url = SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id;
    var r = await fetch(url, { method: 'DELETE', headers: this.headers() });
    return r.status === 204 ? { success: true } : r.json();
  },

  async upsert(table, data) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    var headers = this.headers();
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    var r = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(data) });
    return r.json();
  },

  async getProducts(opts) {
    opts = opts || {};
    var params = 'order=scraped_at.desc&limit=' + (opts.limit || 100);
    if (opts.platform) params += '&platform=eq.' + encodeURIComponent(opts.platform);
    if (opts.search) params += '&name=ilike.*' + encodeURIComponent(opts.search) + '*';
    return this.query('products', params);
  },

  async saveProducts(products) {
    if (!products || products.length === 0) return [];
    var rows = products.map(function(p) {
      return {
        name: p.name || '',
        price: parseFloat(p.price) || 0,
        currency: p.platform === '1688' ? 'CNY' : 'KRW',
        platform: p.platform || '',
        source: p.source || 'scraping',
        category: p.category || '',
        image: p.image || '',
        url: p.url || '',
        rating: parseFloat(p.rating) || 0,
        review_count: parseInt(p.reviewCount) || 0,
        is_rocket: p.isRocket || false,
        trade_quantity: parseInt(p.tradeQuantity) || 0,
        supplier_name: p.supplierName || ''
      };
    });
    var batchSize = 50;
    var results = [];
    for (var i = 0; i < rows.length; i += batchSize) {
      var batch = rows.slice(i, i + batchSize);
      var r = await this.insert('products', batch);
      results = results.concat(r);
    }
    return results;
  },

  async logCrawl(platform, keyword, count, status, error) {
    return this.insert('crawl_logs', { platform: platform, keyword: keyword, product_count: count, status: status || 'success', error_message: error || null });
  },

  async updatePlatformStats(platform, totalProducts, avgPrice) {
    return this.upsert('platform_stats', { platform: platform, total_products: totalProducts, avg_price: avgPrice, date: new Date().toISOString().slice(0, 10) });
  },

  async getSourcingItems(opts) {
    opts = opts || {};
    var params = 'order=created_at.desc&limit=' + (opts.limit || 100);
    if (opts.dateFrom) params += '&date=gte.' + opts.dateFrom;
    if (opts.dateTo) params += '&date=lte.' + opts.dateTo;
    if (opts.platform) params += '&source_platform=eq.' + encodeURIComponent(opts.platform);
    return this.query('sourcing_items', params);
  },

  async saveSourcingItem(item) { return this.insert('sourcing_items', item); },
  async updateSourcingItem(id, item) { item.updated_at = new Date().toISOString(); return this.update('sourcing_items', id, item); },
  async deleteSourcingItem(id) { return this.remove('sourcing_items', id); },

  async getStats(days) { days = days || 7; var since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10); return this.query('platform_stats', 'date=gte.' + since + '&order=date.desc'); },
  async getCrawlHistory(limit) { return this.query('crawl_logs', 'order=crawled_at.desc&limit=' + (limit || 50)); },

  isConfigured: function() { return true; }
};
