chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const products = extract1688Products();
    sendResponse({ products, platform: '1688', url: location.href });
  }
  return true;
});

function extract1688Products() {
  const products = [];

  // Method 1: DOM elements
  const items = document.querySelectorAll('[class*="offer-item"], [class*="sm-offer-item"], .card-container, .offer-list-row');
  items.forEach((item, i) => {
    if (i >= 50) return;
    const nameEl = item.querySelector('[class*="title"], a[title], .offer-title');
    const priceEl = item.querySelector('[class*="price"], .price em, .sm-offer-priceNum');
    const imgEl = item.querySelector('img[src*="cbu01"], img[src*="img.alicdn"]');
    const linkEl = item.querySelector('a[href*="detail.1688.com"], a[href*="offer"]');

    if (nameEl) {
      const name = (nameEl.title || nameEl.textContent || '').trim();
      const priceText = priceEl ? priceEl.textContent.replace(/[^\d.]/g, '') : '0';
      const price = parseFloat(priceText) || 0;
      const img = imgEl ? imgEl.src : '';
      const url = linkEl ? linkEl.href : '';

      if (name.length > 2) {
        products.push({
          name, price, image: img, url,
          platform: '1688', currency: 'CNY',
          priceKRW: Math.round(price * 190.5)
        });
      }
    }
  });

  // Method 2: __INIT_DATA
  if (products.length === 0) {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (text.includes('__INIT_DATA')) {
        try {
          const match = text.match(/var\s+__INIT_DATA\s*=\s*({[\s\S]*?});/);
          if (match) {
            const data = JSON.parse(match[1]);
            const offerList = data?.data?.offerList || [];
            offerList.forEach((item, i) => {
              if (i >= 50) return;
              const name = item?.information?.subject || '';
              const price = parseFloat(item?.tradePrice?.offerPrice?.valueString) || 0;
              if (name) {
                products.push({
                  name, price,
                  image: item?.image?.imgUrl || '',
                  url: 'https://detail.1688.com/offer/' + (item.id || '') + '.html',
                  platform: '1688', currency: 'CNY',
                  priceKRW: Math.round(price * 190.5),
                  tradeQuantity: item?.tradeQuantity?.number || 0
                });
              }
            });
          }
        } catch (e) {}
      }
    }
  }

  return products;
}
