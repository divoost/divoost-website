/* =========================================================================
   DDS Shell — 재설계 화면 공통 상단바/네비/드로어 주입 + 드로어/테마/아이콘.
   사용: <body class="ds-root" data-shell-active="KEY"> 뒤에 이 스크립트 로드.
         루트/‘pages/’ 두 깊이 모두 상대경로 자동 계산.
   의존: design-system.css, ds-shell.css, vendor/lucide/lucide.min.js.
   기존 화면 JS와 독립. #sidebar(드로어)·#menuBtn 식별자 유지.
   ========================================================================= */
(function () {
  'use strict';
  var isPages = location.pathname.indexOf('/pages/') > -1;
  // 루트 기준 경로(p)를 현재 문서 기준 상대경로로 변환
  function rel(p) {
    if (isPages) { return p.indexOf('pages/') === 0 ? p.slice(6) : '../' + p; }
    return p;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var active = document.body.getAttribute('data-shell-active') || '';

  // 상단 네비 주요 항목: [key, label, 루트기준 path]
  var NAV = [
    ['index', '종합 현황', 'index.html'],
    ['campaigns', '캠페인', 'pages/campaigns.html'],
    ['calendar', '캘린더', 'pages/calendar.html'],
    ['create', '콘텐츠 스튜디오', 'pages/create.html'],
    ['shorts', 'AI 숏폼', 'pages/shorts.html'],
    ['media', '미디어', 'pages/media.html'],
    ['publish', '포스팅', 'pages/publish.html'],
    ['engagement', '댓글/반응', 'pages/engagement.html'],
    ['analytics', '분석 리포트', 'pages/analytics.html']
  ];
  // 드로어 전체 메뉴: [섹션명, [[icon, key, label, path], ...]]
  var DRAWER = [
    ['관제', [['home', 'index', '종합 현황', 'index.html'], ['target', 'campaigns', '캠페인', 'pages/campaigns.html'], ['calendar', 'calendar', '콘텐츠 캘린더', 'pages/calendar.html']]],
    ['콘텐츠 제작', [['pen-line', 'create', '콘텐츠 스튜디오', 'pages/create.html'], ['sparkles', 'ai-writer', 'AI 작성기', 'pages/ai-writer.html'], ['clapperboard', 'shorts', 'AI 숏폼 팩토리', 'pages/shorts.html'], ['image', 'media', '자산 라이브러리', 'pages/media.html'], ['layout-template', 'templates', '템플릿', 'pages/templates.html']]],
    ['게시·예약', [['send', 'publish', '게시·발행', 'pages/publish.html'], ['calendar-clock', 'schedule', '예약 발행', 'pages/schedule.html'], ['history', 'history', '발행 이력', 'pages/history.html']]],
    ['인터랙션·승인', [['message-circle', 'engagement', '댓글·DM', 'pages/engagement.html'], ['radar', 'listening', '트렌드·리스닝', 'pages/listening.html'], ['check-circle', 'approvals', '승인함', 'pages/approvals.html']]],
    ['성과·실행', [['bar-chart-3', 'analytics', '성과 분석', 'pages/analytics.html'], ['megaphone', 'ads', '광고 관리', 'pages/ads.html'], ['users', 'koc', '인플루언서(KOC)', 'pages/koc.html'], ['radio', 'live', '라이브 운영', 'pages/live.html']]],
    ['운영·연동', [['bot', 'agents', 'AI 직원', 'pages/agents.html'], ['plug', 'connections', '채널 연결', 'pages/connections.html'], ['building-2', 'organization', '고객사·조직', 'pages/organization.html'], ['git-merge', 'integration', 'EZworks 연동', 'pages/integration.html']]],
    ['시스템', [['settings', 'settings', '설정', 'pages/settings.html'], ['credit-card', 'billing', '요금제·크레딧', 'pages/billing.html'], ['shield-check', 'safety-guide', '운영 가이드', 'pages/safety-guide.html']]]
  ];

  var navHtml = NAV.map(function (n) {
    return '<a class="d-nav-item' + (n[0] === active ? ' is-active' : '') + '" href="' + rel(n[2]) + '">' + esc(n[1]) + '</a>';
  }).join('');

  var drawerHtml = DRAWER.map(function (sec) {
    return '<div class="d-drawer-sec">' + esc(sec[0]) + '</div>' + sec[1].map(function (it) {
      return '<a class="' + (it[1] === active ? 'is-active' : '') + '" href="' + rel(it[3]) + '"><i data-lucide="' + it[0] + '" class="ds-icon ds-icon-sm"></i> ' + esc(it[2]) + '</a>';
    }).join('');
  }).join('');

  // 외부 서비스 바로가기(HubOnTrade 메인 홈 · 소싱 트래커 대시보드) — sns-platform 상위 경로
  var xBase = isPages ? '../../' : '../';
  var xnavHtml = '<div class="d-drawer-sec">바로가기</div>' +
    '<a href="' + xBase + 'index.html"><i data-lucide="globe" class="ds-icon ds-icon-sm"></i> HubOnTrade</a>' +
    '<a href="' + xBase + 'dashboard/index.html"><i data-lucide="search" class="ds-icon ds-icon-sm"></i> 소싱 트래커</a>';

  var shell =
    '<header class="d-topbar">' +
      '<div class="d-logo" onclick="location.href=\'' + rel('index.html') + '\'">' +
        '<div class="d-logo-mark">D</div>' +
        '<div class="d-logo-text">DIVOOST SNS<small>AI MARKETING WORKSPACE</small></div>' +
      '</div>' +
      '<div class="d-switch"><i data-lucide="layout-grid" class="ds-icon ds-icon-sm"></i> HubOnTrade</div>' +
      '<div class="d-topbar-right">' +
        '<span class="ds-badge ds-badge-accent ds-badge-dot">DEMO</span>' +
        '<button class="ds-btn ds-btn-ghost ds-btn-icon" id="themeToggle" title="테마 전환" aria-label="테마 전환"><i data-lucide="sun" class="ds-icon"></i></button>' +
        '<button class="ds-btn ds-btn-primary" onclick="location.href=\'' + rel('pages/create.html') + '\'"><i data-lucide="plus" class="ds-icon"></i> 새 콘텐츠</button>' +
      '</div>' +
    '</header>' +
    '<nav class="d-nav" aria-label="업무 메뉴">' + navHtml +
      '<div class="d-nav-right"><button class="d-nav-more" id="menuBtn"><i data-lucide="menu" class="ds-icon ds-icon-sm"></i> 전체 기능</button></div>' +
    '</nav>' +
    '<aside class="d-drawer" id="sidebar">' +
      '<div class="d-drawer-top"><div><div class="d-drawer-email">divoost@user.com</div><div class="d-drawer-plan">체험플랜 사용 중</div></div>' +
        '<button class="d-drawer-close" aria-label="닫기"><i data-lucide="x" class="ds-icon"></i></button></div>' +
      drawerHtml + xnavHtml +
    '</aside>' +
    '<div class="d-overlay"></div>';

  // body 맨 앞에 셸 삽입(기존 content는 그대로 뒤에 남김)
  var holder = document.createElement('div');
  holder.innerHTML = shell;
  var frag = document.createDocumentFragment();
  while (holder.firstChild) { frag.appendChild(holder.firstChild); }
  document.body.insertBefore(frag, document.body.firstChild);

  // 드로어 토글
  var mb = document.getElementById('menuBtn'), sb = document.getElementById('sidebar'),
      ov = document.querySelector('.d-overlay'), cb = document.querySelector('.d-drawer-close');
  function closeDrawer() { if (sb) sb.classList.remove('open'); if (ov) ov.classList.remove('show'); }
  if (mb && sb) mb.onclick = function () { var open = sb.classList.toggle('open'); if (ov) ov.classList.toggle('show', open); };
  if (ov) ov.onclick = closeDrawer;
  if (cb) cb.onclick = closeDrawer;

  // 테마 복원/토글
  var root = document.documentElement;
  try { var saved = localStorage.getItem('dds-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) { /* 저장소 접근 불가: 기본 테마 유지 */ }
  function syncIcons() { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); }
  var toggle = document.getElementById('themeToggle');
  function updateToggleIcon() {
    if (!toggle) return;
    var icon = toggle.querySelector('[data-lucide]');
    if (icon) icon.setAttribute('data-lucide', root.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon');
    syncIcons();
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('dds-theme', next); } catch (e) { /* 저장 실패 무시 */ }
      updateToggleIcon();
    });
  }
  syncIcons();
  updateToggleIcon();
  window.addEventListener('load', syncIcons);
})();
