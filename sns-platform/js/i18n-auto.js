/* DIVOOST SNS 사이드바 자동 다국어 태거 — /pages/ 하위 페이지용
 * 각 페이지의 사이드바 마크업을 수정하지 않고, 로드 시 자동으로
 *   · 사이드바 nav-link / nav-title / 로고 / 프로필 플랜에 data-i18n 부여
 *   · 상단바 우측에 언어 선택기 주입
 * 이후 i18n.js 엔진이 번역을 적용한다.
 *
 * 포함 순서(중요): i18n-auto.js → i18n-common.js → i18n.js
 *   (auto 가 먼저 태깅 → 엔진이 나중에 apply)
 */
(function(){
    'use strict';

    // nav-link href(파일명) → 공통 사전 키
    var HREF_MAP = {
        'index.html': 'nav_home', 'calendar.html': 'nav_calendar',
        'create.html': 'nav_create', 'ai-writer.html': 'nav_ai',
        'media.html': 'nav_media', 'templates.html': 'nav_templates',
        'publish.html': 'nav_publish', 'schedule.html': 'nav_schedule',
        'history.html': 'nav_history', 'engagement.html': 'nav_engagement',
        'listening.html': 'nav_listening', 'analytics.html': 'nav_analytics',
        'settings.html': 'nav_settings', 'billing.html': 'nav_billing',
        'safety-guide.html': 'nav_guide'
    };

    // nav-title 한국어 → 키 (텍스트 기준)
    var TITLE_MAP = {
        '대시보드': 'nav_title_dashboard', '콘텐츠 생성': 'nav_title_content',
        '포스팅 관리': 'nav_title_posting', '인터렉션': 'nav_title_interaction',
        '시스템': 'nav_title_system'
    };

    function fileOf(href){
        href = (href || '').split('?')[0].split('#')[0];
        var parts = href.split('/');
        return parts[parts.length - 1];
    }

    function tagNavLink(a){
        if(a.querySelector('[data-i18n]')){ return; } // 이미 태깅됨
        var key = HREF_MAP[fileOf(a.getAttribute('href'))];
        if(!key){ return; }
        var emoji = a.querySelector('span'); // 첫 span = 이모지
        // 이모지 뒤 텍스트 노드들을 모아서 라벨 span 으로 감싼다
        var node = emoji ? emoji.nextSibling : a.firstChild;
        var text = '';
        while(node){
            var nx = node.nextSibling;
            if(node.nodeType === 3){ text += node.nodeValue; a.removeChild(node); }
            node = nx;
        }
        var sp = document.createElement('span');
        sp.setAttribute('data-i18n', key);
        sp.textContent = text.replace(/^\s+|\s+$/g, '');
        a.appendChild(document.createTextNode(' '));
        a.appendChild(sp);
    }

    function tagSidebar(){
        var i, els;
        els = document.querySelectorAll('.sidebar-nav .nav-link');
        for(i = 0; i < els.length; i++){ tagNavLink(els[i]); }

        els = document.querySelectorAll('.nav-title');
        for(i = 0; i < els.length; i++){
            var k = TITLE_MAP[(els[i].textContent || '').replace(/^\s+|\s+$/g, '')];
            if(k && !els[i].getAttribute('data-i18n')){ els[i].setAttribute('data-i18n', k); }
        }

        var logo = document.querySelector('.logo-text');
        if(logo && !logo.getAttribute('data-i18n-html')){ logo.setAttribute('data-i18n-html', 'sb_brand'); }

        var plan = document.querySelector('.profile-plan');
        if(plan && !plan.getAttribute('data-i18n') && /체험플랜/.test(plan.textContent || '')){
            plan.setAttribute('data-i18n', 'profile_plan_trial');
        }
    }

    function injectSwitcher(){
        if(document.getElementById('langSelect')){ return; } // 이미 있음
        var topbar = document.querySelector('.top-bar');
        if(!topbar){ return; }
        var right = topbar.querySelector('.top-bar-right');
        if(!right){
            right = document.createElement('div');
            right.className = 'top-bar-right';
            topbar.appendChild(right);
        }
        var sel = document.createElement('select');
        sel.id = 'langSelect';
        sel.setAttribute('aria-label', 'Language');
        sel.style.cssText = 'padding:7px 10px;min-height:38px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#334155;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit';
        sel.innerHTML = '<option value="ko">🇰🇷 한국어</option><option value="en">🇺🇸 English</option><option value="vi">🇻🇳 Tiếng Việt</option>';
        sel.onchange = function(){ if(window.I18N){ window.I18N.setLang(this.value); } };
        right.insertBefore(sel, right.firstChild);
    }

    function run(){ tagSidebar(); injectSwitcher(); }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
