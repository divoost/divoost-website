const SUPABASE_URL = 'https://unruyezigyybnuvgdgdt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    collectCount: 0,
    lastCollect: null,
    autoCollect: false,
    keywords: ['블루투스 이어폰', '실리콘 주방용품', 'LED 무드등'],
    platforms: ['coupang', '1688', 'naver', 'shopee']
  });
  chrome.alarms.create('autoCollect', { periodInMinutes: 360 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoCollect') {
    const { autoCollect } = await chrome.storage.local.get('autoCollect');
    if (autoCollect) {
      console.log('[EZCOMET] Auto collection triggered');
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAVE_PRODUCTS') {
    saveToSupabase(msg.products).then(r => sendResponse(r)).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GET_STATS') {
    chrome.storage.local.get(['collectCount', 'lastCollect'], (data) => sendResponse(data));
    return true;
  }
  if (msg.type === 'SCRAPE_PAGE') {
    chrome.tabs.sendMessage(sender.tab ? sender.tab.id : msg.tabId, { type: 'EXTRACT' }, (response) => {
      sendResponse(response);
    });
    return true;
  }
});

async function saveToSupabase(products) {
  if (!products || products.length === 0) return { saved: 0 };
  const rows = products.map(p => ({
    name: p.name || '',
    price: parseFloat(p.price) || 0,
    currency: p.currency || 'KRW',
    platform: p.platform || '',
    source: 'chrome_extension',
    image: p.image || '',
    url: p.url || '',
    rating: parseFloat(p.rating) || 0,
    review_count: parseInt(p.reviewCount) || 0
  }));

  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/products', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(rows)
    });
    const data = await res.json();
    const count = Array.isArray(data) ? data.length : 0;
    const prev = (await chrome.storage.local.get('collectCount')).collectCount || 0;
    await chrome.storage.local.set({ collectCount: prev + count, lastCollect: new Date().toISOString() });
    return { saved: count };
  } catch (e) {
    return { error: e.message };
  }
}
