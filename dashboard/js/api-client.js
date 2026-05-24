const API = {
  base: window.location.hostname === 'localhost' ? '' : '',

  async coupangSearch(keyword, limit = 20) {
    const res = await fetch(`${this.base}/api/coupang/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
    return res.json();
  },

  async coupangBestsellers(category, limit = 10) {
    const params = new URLSearchParams({ limit });
    if (category) params.set('category', category);
    const res = await fetch(`${this.base}/api/coupang/bestsellers?${params}`);
    return res.json();
  },

  async coupangCategories() {
    const res = await fetch(`${this.base}/api/coupang/categories`);
    return res.json();
  },

  async alibaba1688Search(keyword, page = 1, pageSize = 20) {
    const res = await fetch(`${this.base}/api/1688/search?keyword=${encodeURIComponent(keyword)}&page=${page}&pageSize=${pageSize}`);
    return res.json();
  },

  async alibaba1688Detail(offerId) {
    const res = await fetch(`${this.base}/api/1688/detail?offerId=${offerId}`);
    return res.json();
  },

  async compare(keyword, keyword1688, limit = 10) {
    const params = new URLSearchParams({ keyword, limit });
    if (keyword1688) params.set('keyword1688', keyword1688);
    const res = await fetch(`${this.base}/api/compare?${params}`);
    return res.json();
  },

  async healthCheck() {
    try {
      const res = await fetch(`${this.base}/api/health`);
      return res.json();
    } catch {
      return { status: 'offline' };
    }
  }
};
