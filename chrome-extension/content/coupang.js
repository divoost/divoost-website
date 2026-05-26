chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const products = extractCoupangProducts();
    sendResponse({ products, platform: '쿠팡', url: location.href });
  }
  return true;
});

function extractCoupangProducts() {
  const products = [];
  const items = document.querySelectorAll('li.search-product, li.baby-product, .search-product-wrap li');

  items.forEach((item, i) => {
    if (i >= 50) return;
    const nameEl = item.querySelector('.name, .title, .product-name');
    const priceEl = item.querySelector('.price-value, .price .value, .sale-price');
    const imgEl = item.querySelector('img.search-product-wrap-img, img[src*="thumbnail"], img[data-img-src]');
    const linkEl = item.querySelector('a[href*="/vp/products/"], a.search-product-link');
    const ratingEl = item.querySelector('.rating');
    const reviewEl = item.querySelector('.rating-total-count');
    const rocketEl = item.querySelector('.badge-rocket, .rocket-icon, [class*="rocket"]');

    if (nameEl) {
      const name = nameEl.textContent.trim();
      const price = priceEl ? parseInt(priceEl.textContent.replace(/[^\d]/g, '')) || 0 : 0;
      const img = imgEl ? (imgEl.src || imgEl.dataset.imgSrc || '') : '';
      const url = linkEl ? 'https://www.coupang.com' + linkEl.getAttribute('href') : location.href;
      const rating = ratingEl ? parseFloat(ratingEl.textContent) || 0 : 0;
      const reviewCount = reviewEl ? parseInt(reviewEl.textContent.replace(/[^\d]/g, '')) || 0 : 0;

      if (name.length > 2) {
        products.push({
          name, price, image: img, url,
          platform: '쿠팡', currency: 'KRW',
          rating, reviewCount,
          isRocket: !!rocketEl
        });
      }
    }
  });

  return products;
}
