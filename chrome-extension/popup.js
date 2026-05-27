document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['collectCount', 'lastCollect', 'autoCollect']);
  document.getElementById('totalCollected').textContent = data.collectCount || 0;
  if (data.lastCollect) {
    const d = new Date(data.lastCollect);
    document.getElementById('lastTime').textContent = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  if (data.autoCollect) document.getElementById('autoToggle').classList.add('active');

  document.getElementById('scrapeBtn').addEventListener('click', scrapeCurrentPage);
  document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://divoost.github.io/divoost-website/dashboard/' });
  });
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
});

async function scrapeCurrentPage() {
  const btn = document.getElementById('scrapeBtn');
  const result = document.getElementById('scrapeResult');
  btn.disabled = true;
  btn.textContent = '🕷 수집 중...';
  addLog('현재 페이지 수집 시작...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('활성 탭을 찾을 수 없습니다');

    const platform = detectPlatform(tab.url);
    if (!platform) {
      addLog('⚠ 지원하지 않는 사이트입니다');
      result.style.display = 'block';
      result.style.background = 'rgba(239,68,68,.1)';
      result.style.color = '#f87171';
      result.textContent = '지원 사이트: 쿠팡, 1688, 네이버 쇼핑, Shopee';
      btn.disabled = false;
      btn.textContent = '🕷 이 페이지에서 상품 수집';
      return;
    }

    addLog(platform + ' 페이지 감지됨');

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' });
    if (!response || !response.products || response.products.length === 0) {
      addLog('상품을 찾을 수 없습니다');
      result.style.display = 'block';
      result.style.background = 'rgba(249,115,22,.1)';
      result.style.color = '#fb923c';
      result.textContent = '이 페이지에서 상품을 찾을 수 없습니다. 검색 결과 페이지에서 시도하세요.';
      btn.disabled = false;
      btn.textContent = '🕷 이 페이지에서 상품 수집';
      return;
    }

    addLog(response.products.length + '개 상품 발견');
    addLog('Supabase DB 저장 중...');

    const saveResult = await chrome.runtime.sendMessage({ type: 'SAVE_PRODUCTS', products: response.products });
    if (saveResult.error) {
      addLog('⚠ DB 저장 실패: ' + saveResult.error);
    } else {
      addLog('✅ ' + (saveResult.saved || 0) + '개 DB 저장 완료');
    }

    result.style.display = 'block';
    result.style.background = 'rgba(16,185,129,.1)';
    result.style.color = '#34d399';
    result.textContent = '✅ ' + response.products.length + '개 상품 수집 → DB 저장 완료!';

    const prev = (await chrome.storage.local.get('collectCount')).collectCount || 0;
    document.getElementById('totalCollected').textContent = prev;
    document.getElementById('lastTime').textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    chrome.storage.local.set({ ['cnt_' + platform]: response.products.length });

  } catch (e) {
    addLog('✗ 오류: ' + e.message);
    result.style.display = 'block';
    result.style.background = 'rgba(239,68,68,.1)';
    result.style.color = '#f87171';
    result.textContent = '오류: ' + e.message;
  }

  btn.disabled = false;
  btn.textContent = '🕷 이 페이지에서 상품 수집';
}

function detectPlatform(url) {
  if (url.includes('coupang.com')) return 'coupang';
  if (url.includes('1688.com')) return '1688';
  if (url.includes('shopping.naver.com')) return 'naver';
  if (url.includes('shopee.')) return 'shopee';
  if (url.includes('lazada.')) return 'lazada';
  if (url.includes('gmarket.')) return 'gmarket';
  if (url.includes('tiktok.com')) return 'tiktok';
  return null;
}

function toggleAuto() {
  const el = document.getElementById('autoToggle');
  el.classList.toggle('active');
  const isActive = el.classList.contains('active');
  chrome.storage.local.set({ autoCollect: isActive });
  addLog(isActive ? '자동 수집 활성화 (6시간마다)' : '자동 수집 비활성화');
}

async function exportCSV() {
  addLog('CSV 내보내기...');
  const data = await chrome.storage.local.get(null);
  const blob = new Blob(['수집 데이터 내보내기\n총 수집: ' + (data.collectCount || 0) + '개\n마지막: ' + (data.lastCollect || '-')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url: 'https://divoost.github.io/divoost-website/dashboard/db-view.html' });
}

function addLog(msg) {
  const log = document.getElementById('logArea');
  const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  log.innerHTML += '\n[' + time + '] ' + msg;
  log.scrollTop = log.scrollHeight;
}
