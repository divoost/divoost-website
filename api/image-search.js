// 이미지 역검색 백엔드 (Vercel Serverless, Node)
// POST { provider, imageUrl, imageData(base64) }  →  { ok, items:[{name,price,priceText,image,url,platform}] }
//
// ⚠️ 정직한 한계:
//  - 1688/타오바오/알리/쇼피/아마존/네이버의 "이미지 검색"은 공개 API가 아니며,
//    이미지 업로드 + 안티봇(서명/쿠키) 처리가 필요합니다. 단순 GET 으로는 차단됩니다.
//  - 안정적 운영에는 (a) 렌더링 가능한 프록시(SCRAPER_API_KEY) 또는
//    (b) 헤드리스 브라우저 서버가 필요합니다. 키 미설정 시 명확한 에러를 반환합니다.
//  - 가장 호환성 높은 크로스플랫폼 역이미지검색은 Google Lens 입니다.
//
// 환경변수:
//   SCRAPER_API_KEY   : 렌더링 프록시(ScraperAPI 등) 키. 1688/네이버/구글렌즈 렌더에 사용.

const fetch = require('node-fetch');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 프록시(ScraperAPI)로 렌더링된 HTML/JSON 가져오기
async function renderFetch(targetUrl, opts) {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) {
    const e = new Error('백엔드 미설정: SCRAPER_API_KEY 환경변수가 필요합니다');
    e.code = 'NO_KEY';
    throw e;
  }
  opts = opts || {};
  const render = opts.render ? 'true' : 'false';
  const country = opts.country || 'kr';
  const url = 'https://api.scraperapi.com/?api_key=' + key +
    '&url=' + encodeURIComponent(targetUrl) +
    '&country_code=' + country + '&render=' + render;
  const r = await fetch(url, { timeout: 60000 });
  if (!r.ok) throw new Error('프록시 응답 오류 HTTP ' + r.status);
  return r;
}

// ─── 네이버 쇼핑 이미지 검색 (스마트렌즈) ───
// 네이버는 이미지 업로드 후 lens 결과를 반환. imageUrl 이 공개 URL 일 때만 시도 가능.
async function searchNaver(imageUrl) {
  if (!imageUrl) throw new Error('네이버 이미지검색은 공개 이미지 URL 이 필요합니다 (업로드 이미지는 임시호스팅 필요)');
  // 네이버 스마트렌즈 결과 페이지를 프록시 렌더 → 상품 파싱
  const lens = 'https://lens.naver.com/api/search?url=' + encodeURIComponent(imageUrl);
  const r = await renderFetch(lens, { render: true, country: 'kr' });
  const data = await r.json().catch(() => null);
  if (!data) throw new Error('네이버 렌즈 응답 파싱 실패 (엔드포인트 변경 가능)');
  const items = (data.shopping || data.items || []).map(function (it) {
    return {
      name: it.title || it.productName || '',
      price: it.price || 0,
      priceText: it.price ? '₩' + Number(it.price).toLocaleString() : '',
      image: it.imageUrl || it.thumbnail || '',
      url: it.link || it.url || '',
      platform: '네이버'
    };
  });
  return items;
}

// ─── Google Lens (크로스플랫폼 역이미지검색, 가장 호환성 높음) ───
async function searchGoogleLens(imageUrl) {
  if (!imageUrl) throw new Error('Google Lens 는 공개 이미지 URL 이 필요합니다');
  const lensUrl = 'https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(imageUrl);
  const r = await renderFetch(lensUrl, { render: true, country: 'us' });
  // 렌더된 HTML 에서 쇼핑 결과 추출은 셀렉터 의존적 → 구조화 프록시(SerpAPI 등) 권장.
  // 여기서는 원문 HTML 을 반환하지 않고, 구조화 미지원 시 명확히 안내.
  await r.text();
  throw new Error('Google Lens 결과 파싱은 구조화 API(SerpAPI google_lens) 연결을 권장합니다');
}

// ─── 1688 / 타오바오 / 알리 (Alibaba 拍立淘 이미지검색) ───
// 흐름: 이미지 업로드 → imageId 발급 → imageId 로 검색.
// 업로드 엔드포인트는 안티봇(umid/sign)이 필요해 서버측에서 단순 호출이 어렵습니다.
async function searchAlibaba(provider, imageUrl) {
  // imageId 업로드 단계는 공식 미지원 + 안티봇 → 헤드리스 브라우저 또는
  // Alibaba 이미지검색 지원 프록시가 필요합니다.
  throw new Error(provider + ' 이미지검색(拍立淘)은 이미지 업로드+안티봇 처리가 필요합니다. ' +
    '헤드리스 브라우저 서버 또는 이미지검색 지원 프록시 연결이 필요합니다 (docs/image-search-setup.md).');
}

const HANDLERS = {
  naver: function (imageUrl) { return searchNaver(imageUrl); },
  google: function (imageUrl) { return searchGoogleLens(imageUrl); },
  '1688': function (imageUrl) { return searchAlibaba('1688', imageUrl); },
  taobao: function (imageUrl) { return searchAlibaba('타오바오', imageUrl); },
  aliexpress: function (imageUrl) { return searchAlibaba('알리익스프레스', imageUrl); },
  shopee: function (imageUrl) { return searchAlibaba('쇼피', imageUrl); },
  amazon: function (imageUrl) { return searchAlibaba('아마존', imageUrl); }
};

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const provider = body.provider;
    const imageUrl = body.imageUrl || '';
    // body.imageData(base64)는 업로드 이미지 → 임시 호스팅 업로드가 선행되어야 함(미구현).

    const handler = HANDLERS[provider];
    if (!handler) { res.status(400).json({ ok: false, error: '지원하지 않는 provider: ' + provider }); return; }

    const items = await handler(imageUrl);
    res.status(200).json({ ok: true, provider: provider, items: items });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message || String(err) });
  }
};
