/* =========================================================================
   DDS Shell (Admin) — 관리자 콘솔 공통 상단바/네비/드로어 주입 + 테마/아이콘.
   사용: admin/*.html 의 <body class="ds-root" data-shell-active="KEY"> 뒤 로드.
   경로: admin/ 폴더 기준(서로 같은 폴더). 사용자 사이트는 ../index.html.
   의존: ../css/design-system.css, ../css/ds-shell.css, ../vendor/lucide/lucide.min.js.
   ========================================================================= */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var active = document.body.getAttribute('data-shell-active') || '';

  // 상단 네비 주요 항목: [key, label, path(admin 폴더 기준)]
  var NAV = [
    ['index', '대시보드', 'index.html'],
    ['users', '회원', 'users.html'],
    ['subscriptions', '구독', 'subscriptions.html'],
    ['content-moderation', '콘텐츠 검토', 'content-moderation.html'],
    ['reports', '신고·제재', 'reports.html'],
    ['audit-log', '감사 로그', 'audit-log.html'],
    ['system-health', '시스템', 'system-health.html']
  ];
  // 드로어 전체 메뉴: [섹션명, [[icon, key, label, path], ...]]
  var DRAWER = [
    ['대시보드', [['layout-dashboard', 'index', '관리자 대시보드', 'index.html']]],
    ['회원·결제', [['users', 'users', '회원 관리', 'users.html'], ['credit-card', 'subscriptions', '구독 관리', 'subscriptions.html']]],
    ['콘텐츠·신고', [['file-check', 'content-moderation', '콘텐츠 검토', 'content-moderation.html'], ['flag', 'reports', '신고·제재', 'reports.html'], ['bell', 'notifications', '공지 관리', 'notifications.html']]],
    ['모니터링', [['activity', 'api-monitor', 'API 모니터', 'api-monitor.html'], ['heart-pulse', 'system-health', '시스템 상태', 'system-health.html'], ['footprints', 'user-activity', '활동 로그', 'user-activity.html'], ['scroll-text', 'audit-log', '감사 로그', 'audit-log.html']]],
    ['설정', [['settings', 'admin-settings', '관리자 설정', 'admin-settings.html'], ['mail', 'email-center', '이메일 센터', 'email-center.html']]]
  ];

  var navHtml = NAV.map(function (n) {
    return '<a class="d-nav-item' + (n[0] === active ? ' is-active' : '') + '" href="' + n[2] + '">' + esc(n[1]) + '</a>';
  }).join('');

  var drawerHtml = DRAWER.map(function (sec) {
    return '<div class="d-drawer-sec">' + esc(sec[0]) + '</div>' + sec[1].map(function (it) {
      return '<a class="' + (it[1] === active ? 'is-active' : '') + '" href="' + it[3] + '"><i data-lucide="' + it[0] + '" class="ds-icon ds-icon-sm"></i> ' + esc(it[2]) + '</a>';
    }).join('');
  }).join('');

  var shell =
    '<header class="d-topbar">' +
      '<div class="d-logo" onclick="location.href=\'index.html\'">' +
        '<div class="d-logo-mark">D</div>' +
        '<div class="d-logo-text">DIVOOST SNS<small>ADMIN CONSOLE</small></div>' +
      '</div>' +
      '<div class="d-switch"><i data-lucide="shield" class="ds-icon ds-icon-sm"></i> 관리자 콘솔</div>' +
      '<div class="d-topbar-right">' +
        '<button class="ds-btn ds-btn-ghost ds-btn-icon" id="themeToggle" title="테마 전환" aria-label="테마 전환"><i data-lucide="sun" class="ds-icon"></i></button>' +
        '<button class="ds-btn ds-btn-secondary" onclick="location.href=\'../index.html\'"><i data-lucide="external-link" class="ds-icon ds-icon-sm"></i> 사용자 사이트</button>' +
      '</div>' +
    '</header>' +
    '<nav class="d-nav" aria-label="관리자 메뉴">' + navHtml +
      '<div class="d-nav-right"><button class="d-nav-more" id="menuBtn"><i data-lucide="menu" class="ds-icon ds-icon-sm"></i> 전체 메뉴</button></div>' +
    '</nav>' +
    '<aside class="d-drawer" id="sidebar">' +
      '<div class="d-drawer-top"><div><div class="d-drawer-email">관리자 콘솔</div><div class="d-drawer-plan">super_admin</div></div>' +
        '<button class="d-drawer-close" aria-label="닫기"><i data-lucide="x" class="ds-icon"></i></button></div>' +
      drawerHtml +
    '</aside>' +
    '<div class="d-overlay"></div>';

  var holder = document.createElement('div');
  holder.innerHTML = shell;
  var frag = document.createDocumentFragment();
  while (holder.firstChild) { frag.appendChild(holder.firstChild); }
  document.body.insertBefore(frag, document.body.firstChild);

  var mb = document.getElementById('menuBtn'), sb = document.getElementById('sidebar'),
      ov = document.querySelector('.d-overlay'), cb = document.querySelector('.d-drawer-close');
  function closeDrawer() { if (sb) sb.classList.remove('open'); if (ov) ov.classList.remove('show'); }
  if (mb && sb) mb.onclick = function () { var open = sb.classList.toggle('open'); if (ov) ov.classList.toggle('show', open); };
  if (ov) ov.onclick = closeDrawer;
  if (cb) cb.onclick = closeDrawer;

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
