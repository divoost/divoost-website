const DataManager = {
  STORAGE_KEY: 'sourcing_tracker_data',

  getAll() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  save(products) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
  },

  add(product) {
    const products = this.getAll();
    product.id = Date.now().toString();
    product.createdAt = new Date().toISOString();
    products.unshift(product);
    this.save(products);
    return product;
  },

  update(id, updates) {
    const products = this.getAll();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(products);
    return products[idx];
  },

  delete(id) {
    const products = this.getAll().filter(p => p.id !== id);
    this.save(products);
  },

  filter({ platform, category, dateFrom, dateTo, search, sortBy, sortDir }) {
    let products = this.getAll();

    if (platform && platform !== 'all') {
      products = products.filter(p => p.sourcePlatform === platform || p.sellPlatform === platform);
    }
    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    if (dateFrom) {
      products = products.filter(p => p.date >= dateFrom);
    }
    if (dateTo) {
      products = products.filter(p => p.date <= dateTo);
    }
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.keywords && p.keywords.toLowerCase().includes(q))
      );
    }
    if (sortBy) {
      products.sort((a, b) => {
        let va = a[sortBy], vb = b[sortBy];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'desc' ? 1 : -1;
        if (va > vb) return sortDir === 'desc' ? -1 : 1;
        return 0;
      });
    }
    return products;
  },

  getStats(dateFrom, dateTo) {
    const products = this.filter({ dateFrom, dateTo });
    const categories = {};
    const platforms = {};

    products.forEach(p => {
      if (!categories[p.category]) categories[p.category] = { count: 0, totalMargin: 0, totalSales: 0 };
      categories[p.category].count++;
      categories[p.category].totalMargin += (p.marginPct || 0);
      categories[p.category].totalSales += (p.monthlySales || 0);

      if (!platforms[p.sellPlatform]) platforms[p.sellPlatform] = { count: 0, totalMargin: 0 };
      platforms[p.sellPlatform].count++;
      platforms[p.sellPlatform].totalMargin += (p.marginPct || 0);
    });

    Object.keys(categories).forEach(k => {
      if (categories[k].count > 0) categories[k].avgMargin = (categories[k].totalMargin / categories[k].count).toFixed(1);
    });
    Object.keys(platforms).forEach(k => {
      if (platforms[k].count > 0) platforms[k].avgMargin = (platforms[k].totalMargin / platforms[k].count).toFixed(1);
    });

    return {
      total: products.length,
      avgMargin: products.length ? (products.reduce((s, p) => s + (p.marginPct || 0), 0) / products.length).toFixed(1) : 0,
      totalSales: products.reduce((s, p) => s + (p.monthlySales || 0), 0),
      categories,
      platforms
    };
  },

  getMonthlyStats() {
    const products = this.getAll();
    const monthly = {};
    products.forEach(p => {
      const month = p.date ? p.date.substring(0, 7) : 'unknown';
      if (!monthly[month]) monthly[month] = { count: 0, totalMargin: 0, totalSales: 0 };
      monthly[month].count++;
      monthly[month].totalMargin += (p.marginPct || 0);
      monthly[month].totalSales += (p.monthlySales || 0);
    });
    Object.keys(monthly).forEach(k => {
      if (monthly[k].count > 0) monthly[k].avgMargin = (monthly[k].totalMargin / monthly[k].count).toFixed(1);
    });
    return monthly;
  },

  exportJSON() {
    const data = this.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sourcing-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) { reject('유효한 JSON 배열이 아닙니다'); return; }
          const existing = this.getAll();
          const merged = [...data, ...existing];
          this.save(merged);
          resolve(data.length);
        } catch (err) { reject('JSON 파싱 오류: ' + err.message); }
      };
      reader.readAsText(file);
    });
  },

  loadSampleData() {
    if (this.getAll().length > 0) return;
    const samples = [
      { name:"실리콘 주방용품 12종 세트", category:"주방용품", sourcePlatform:"1688", sellPlatform:"쿠팡", sourcePrice:12.5, sourceCurrency:"CNY", sellPrice:18900, sellCurrency:"KRW", shippingCost:1800, marginPct:54.2, monthlySales:3847, salesRank:3, date:"2026-05-24", keywords:"硅胶厨具套装", badges:"实力商家", directShipping:true, status:"판매중", memo:"마진 우수, 꾸준한 판매" },
      { name:"LED 무드등 리모컨 포함", category:"홈인테리어", sourcePlatform:"1688", sellPlatform:"쿠팡", sourcePrice:18.0, sourceCurrency:"CNY", sellPrice:15900, sellCurrency:"KRW", shippingCost:1200, marginPct:48.7, monthlySales:2156, salesRank:5, date:"2026-05-24", keywords:"LED氛围灯", badges:"超级工厂", directShipping:true, status:"판매중", memo:"리뷰 급상승" },
      { name:"메이크업 브러쉬 15종 세트", category:"뷰티도구", sourcePlatform:"1688", sellPlatform:"쿠팡", sourcePrice:8.5, sourceCurrency:"CNY", sellPrice:12900, sellCurrency:"KRW", shippingCost:800, marginPct:56.8, monthlySales:5621, salesRank:2, date:"2026-05-23", keywords:"化妆刷套装", badges:"实力商家", directShipping:true, status:"판매중", memo:"" },
      { name:"강아지 노즈워크 장난감", category:"반려동물", sourcePlatform:"1688", sellPlatform:"쿠팡", sourcePrice:6.0, sourceCurrency:"CNY", sellPrice:9900, sellCurrency:"KRW", shippingCost:1000, marginPct:51.3, monthlySales:1893, salesRank:7, date:"2026-05-23", keywords:"狗狗嗅闻玩具", badges:"超级工厂", directShipping:true, status:"판매중", memo:"" },
      { name:"TWS 블루투스 이어폰 5.3", category:"전자기기", sourcePlatform:"1688", sellPlatform:"쿠팡", sourcePrice:22.0, sourceCurrency:"CNY", sellPrice:14900, sellCurrency:"KRW", shippingCost:1000, marginPct:42.1, monthlySales:8234, salesRank:1, date:"2026-05-22", keywords:"蓝牙耳机TWS", badges:"实力商家,超级工厂", directShipping:true, status:"판매중", memo:"판매량 1위" },
      { name:"차량용 트렁크 정리함", category:"자동차용품", sourcePlatform:"1688", sellPlatform:"쿠팡", sourcePrice:25.0, sourceCurrency:"CNY", sellPrice:19900, sellCurrency:"KRW", shippingCost:2500, marginPct:44.8, monthlySales:1245, salesRank:4, date:"2026-05-22", keywords:"车载收纳箱", badges:"实力商家", directShipping:true, status:"판매중", memo:"" },
      { name:"에코백 캔버스 토트백", category:"패션잡화", sourcePlatform:"타오바오", sellPlatform:"네이버", sourcePrice:5.5, sourceCurrency:"CNY", sellPrice:8900, sellCurrency:"KRW", shippingCost:800, marginPct:45.2, monthlySales:4567, salesRank:6, date:"2026-05-21", keywords:"帆布包", badges:"", directShipping:true, status:"판매중", memo:"" },
      { name:"몬테소리 원목 퍼즐 세트", category:"유아/아동", sourcePlatform:"타오바오", sellPlatform:"지마켓", sourcePrice:28.0, sourceCurrency:"CNY", sellPrice:22900, sellCurrency:"KRW", shippingCost:2000, marginPct:38.5, monthlySales:987, salesRank:12, date:"2026-05-21", keywords:"蒙氏教具", badges:"实力商家", directShipping:false, status:"조사중", memo:"직배송 불가" },
      { name:"요가매트 6mm 논슬립", category:"스포츠", sourcePlatform:"1688", sellPlatform:"쿠팡", sourcePrice:20.0, sourceCurrency:"CNY", sellPrice:16900, sellCurrency:"KRW", shippingCost:3500, marginPct:33.1, monthlySales:3421, salesRank:8, date:"2026-05-20", keywords:"瑜伽垫", badges:"", directShipping:false, status:"판매중", memo:"배송비 높음" },
      { name:"USB-C 고속 충전 케이블 3개", category:"전자기기", sourcePlatform:"1688", sellPlatform:"네이버", sourcePrice:3.5, sourceCurrency:"CNY", sellPrice:7900, sellCurrency:"KRW", shippingCost:500, marginPct:52.6, monthlySales:12450, salesRank:2, date:"2026-05-20", keywords:"数据线", badges:"实力商家", directShipping:true, status:"판매중", memo:"소형 고마진" },
      { name:"고양이 스크래처 골판지", category:"반려동물", sourcePlatform:"타오바오", sellPlatform:"쿠팡", sourcePrice:8.0, sourceCurrency:"CNY", sellPrice:11900, sellCurrency:"KRW", shippingCost:2000, marginPct:39.8, monthlySales:2134, salesRank:11, date:"2026-05-19", keywords:"猫抓板", badges:"", directShipping:true, status:"판매중", memo:"" },
      { name:"스테인리스 밀폐용기 4종", category:"주방용품", sourcePlatform:"1688", sellPlatform:"지마켓", sourcePrice:30.0, sourceCurrency:"CNY", sellPrice:21900, sellCurrency:"KRW", shippingCost:2200, marginPct:36.7, monthlySales:2876, salesRank:9, date:"2026-05-19", keywords:"不锈钢密封罐", badges:"超级工厂", directShipping:true, status:"판매중", memo:"" }
    ];
    samples.forEach(s => this.add(s));
  }
};
