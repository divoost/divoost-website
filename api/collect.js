module.exports = async (req, res) => {
  const results = { timestamp: new Date().toISOString(), collections: [] };

  const keywords = {
    coupang: ['블루투스 이어폰', '실리콘 주방용품', 'LED 무드등', '메이크업 브러쉬', '강아지 장난감'],
    alibaba: ['蓝牙耳机', '硅胶厨具', 'LED氛围灯', '化妆刷套装', '狗狗嗅闻玩具']
  };

  for (const kw of keywords.coupang) {
    try {
      const url = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/coupang/search?keyword=${encodeURIComponent(kw)}`;
      const r = await fetch(url);
      const data = await r.json();
      results.collections.push({ platform: '쿠팡', keyword: kw, count: data.total || 0, success: data.success || false });
    } catch (e) {
      results.collections.push({ platform: '쿠팡', keyword: kw, count: 0, success: false, error: e.message });
    }
  }

  for (const kw of keywords.alibaba) {
    try {
      const url = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/1688/search?keyword=${encodeURIComponent(kw)}`;
      const r = await fetch(url);
      const data = await r.json();
      results.collections.push({ platform: '1688', keyword: kw, count: data.total || 0, success: data.success || false });
    } catch (e) {
      results.collections.push({ platform: '1688', keyword: kw, count: 0, success: false, error: e.message });
    }
  }

  results.summary = {
    total: results.collections.length,
    success: results.collections.filter(c => c.success).length,
    totalProducts: results.collections.reduce((s, c) => s + c.count, 0)
  };

  res.status(200).json(results);
};
