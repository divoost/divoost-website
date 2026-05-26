chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXTRACT') {
    const products = extractNaverProducts();
    sendResponse({ products, platform: '네이버', url: location.href });
  }
  return true;
});

function extractNaverProducts() {
  const products = [];
  const items = document.querySelectorAll('.product_item, .basicList_item, [class*="product_info"]');

  items.forEach((item, i) => {
    if (i >= 50) return;
    const nameEl = item.querySelector('.product_title, .basicList_title, a[title]');
    const priceEl = item.querySelector('.price_num, .product_num, [class*="price"] em, [class*="price"] span');
    const imgEl = item.querySelector('img[src*="shop"], img.product_img, img[data-nclick]');
    const linkEl = item.querySelector('a[href*="smartstore"], a[href*="shopping.naver"], a.product_link');
    const mallEl = item.querySelector('.product_mall_title, .basicList_mall, [class*="mall"]');
    const reviewEl = item.querySelector('[class*="review"], [class*="count"]');

    if (nameEl) {
      const name = (nameEl.title || nameEl.textContent || '').trim();
      const price = priceEl ? parseInt(priceEl.textContent.replace(/[^\d]/g, '')) || 0 : 0;

      if (name.length > 2) {
        products.push({
          name, price,
          image: imgEl ? imgEl.src : '',
          url: linkEl ? linkEl.href : '',
          platform: '네이버', currency: 'KRW',
          mall: mallEl ? mallEl.textContent.trim() : '',
          reviewCount: reviewEl ? parseInt(reviewEl.textContent.replace(/[^\d]/g, '')) || 0 : 0
        });
      }
    }
  });

  return products;
}
