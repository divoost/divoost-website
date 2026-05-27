chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const products = extractShopeeProducts();
    sendResponse({ products, platform: 'Shopee', url: location.href });
  }
  return true;
});

function extractShopeeProducts() {
  const products = [];
  const items = document.querySelectorAll('[data-sqe="item"], .shopee-search-item-result__item, [class*="col-xs-2-4"]');

  items.forEach((item, i) => {
    if (i >= 50) return;
    const nameEl = item.querySelector('[data-sqe="name"], .ie3A\\+n, [class*="line-clamp"]');
    const priceEl = item.querySelector('[class*="price"], .vioxXd, span[aria-label]');
    const imgEl = item.querySelector('img[src*="shopee"], img[class*="image"]');
    const linkEl = item.querySelector('a[href*="/product/"], a[data-sqe="link"]');
    const ratingEl = item.querySelector('[class*="rating"], .shopee-rating-stars');
    const soldEl = item.querySelector('[class*="sold"], [class*="count"]');

    if (nameEl || item.querySelector('img')) {
      const name = nameEl ? nameEl.textContent.trim() : '';
      const priceText = priceEl ? priceEl.textContent.replace(/[^\d.]/g, '') : '0';
      const price = parseFloat(priceText) || 0;

      if (name.length > 2) {
        products.push({
          name, price,
          image: imgEl ? imgEl.src : '',
          url: linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : location.origin + linkEl.getAttribute('href')) : '',
          platform: 'Shopee',
          currency: detectShopeeCurrency(),
          soldCount: soldEl ? parseInt(soldEl.textContent.replace(/[^\d]/g, '')) || 0 : 0
        });
      }
    }
  });

  return products;
}

function detectShopeeCurrency() {
  const host = location.hostname;
  if (host.includes('.vn')) return 'VND';
  if (host.includes('.co.id')) return 'IDR';
  if (host.includes('.co.th')) return 'THB';
  if (host.includes('.sg')) return 'SGD';
  return 'USD';
}
