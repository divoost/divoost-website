/* 소싱 대시보드 사이드바 자동 다국어 태거 — 전 페이지용
 * 사이드바 마크업 수정 없이 로드 시 자동으로 data-i18n 부여 + 언어 선택기 주입.
 * 포함 순서(중요): i18n-auto.js → i18n-common.js → i18n.js
 */
(function(){
    'use strict';

    // sidebar-link href(파일명/경로) → 키
    function navKey(href){
        href = (href || '').split('?')[0].split('#')[0];
        if(href.indexOf('sns-platform') > -1){ return 'nav_sns'; }
        if(href === '../index.html'){ return 'nav_home'; }
        var f = href.split('/').pop();
        var map = {
            'index.html': 'nav_overview', 'products.html': 'nav_products', 'trends.html': 'nav_trends',
            'platforms.html': 'nav_platforms', 'search-reviews.html': 'nav_search', 'margin.html': 'nav_margin',
            'ai-sourcing.html': 'nav_ai', 'admin.html': 'nav_admin', 'keyword-analysis.html': 'nav_keyword',
            'listing.html': 'nav_listing', 'scraper.html': 'nav_scraper', 'db-view.html': 'nav_db',
            'live-search.html': 'nav_live', 'coupang-partners.html': 'nav_coupang_api'
        };
        return map[f] || null;
    }

    var SECTION_MAP = {
        '소싱 플랫폼': 'sec_sourcing', '판매 플랫폼': 'sec_selling', '글로벌 마켓': 'sec_global',
        '대시보드': 'sec_dashboard', '관리': 'sec_manage', '바로가기': 'sec_shortcut'
    };
    var BADGE_MAP = { '타오바오': 'pf_taobao', '쿠팡': 'pf_coupang', '지마켓': 'pf_gmarket', '네이버': 'pf_naver' };

    // 각 페이지 상단바 제목(텍스트) → 키 (per-page 편집 없이 자동 번역)
    var TOPBAR_MAP = {
        '추천 상품 트래커': 'tbt_products', '트렌드 분석': 'tbt_trends', '플랫폼 비교': 'tbt_platforms',
        '검색 & 리뷰 분석': 'tbt_search', '마진 분석': 'tbt_margin', 'AI 상품 소싱': 'tbt_ai',
        '상품 관리': 'tbt_admin', '🔑 키워드 블루오션 분석': 'tbt_keyword', '마켓플레이스 리스팅': 'tbt_listing',
        '🕷 반자동 스크래퍼': 'tbt_scraper', '💾 DB 데이터 보기': 'tbt_db', '실시간 소싱 검색': 'tbt_live'
    };

    // 테이블 헤더(<th>) 한국어 → 키 (전 페이지 공통 자동 번역)
    var TH_MAP = {
        '상품명':'th_product','플랫폼':'th_platform','가격':'th_price','이미지':'th_image','링크':'th_link',
        '평점':'th_rating','순위':'th_rank','비교 항목':'th_compare','리뷰':'th_review','현재리뷰':'th_cur_review',
        '핫아이템':'th_hot','평균별점':'th_avg_star','평균마진':'th_avg_margin','판매처':'th_seller','판매가':'th_sell_price',
        '타오바오':'pf_taobao','쿠팡 마진':'th_coupang_margin','쿠팡 가격':'th_coupang_price','쿠팡':'pf_coupang',
        '추천일':'th_rec_date','추천상품':'th_rec_product','최적 판매처':'th_best_seller','총원가':'th_total_cost',
        '지마켓 마진':'th_gmarket_margin','지마켓 가격':'th_gmarket_price','지마켓':'pf_gmarket','증가율':'th_growth_rate',
        '증가수':'th_growth_cnt','전주대비':'th_vs_lastweek','작업':'th_action','신규발견':'th_new_found','순마진':'th_net_margin',
        '수집상품':'th_collected','수수료':'th_fee','소싱처':'th_source','소싱가(1688)':'th_source_price_1688','소싱가':'th_source_price',
        '상품수':'th_product_cnt','상세':'th_detail','비율':'th_ratio','배송비':'th_shipping','마진율':'th_margin_rate',
        '마진 등급':'th_margin_grade','리스팅':'th_listing','리뷰수':'th_review_cnt','등급':'th_grade','네이버 스토어':'th_naver_store',
        '네이버 마진':'th_naver_margin','네이버 가격':'th_naver_price','네이버':'pf_naver','날짜':'th_date','기준':'th_basis',
        '기간':'th_period','관세':'th_tariff','7일전':'th_7days_ago'
    };

    function trim(s){ return (s || '').replace(/^\s+|\s+$/g, ''); }

    // el 안의 (innerEl 다음) 텍스트 노드를 data-i18n span 으로 감싼다
    function wrapTextAfter(el, innerEl, key){
        if(el.querySelector('[data-i18n]')){ return; }
        var node = innerEl ? innerEl.nextSibling : el.firstChild;
        var text = '';
        while(node){
            var nx = node.nextSibling;
            if(node.nodeType === 3){ text += node.nodeValue; el.removeChild(node); }
            node = nx;
        }
        var sp = document.createElement('span');
        sp.setAttribute('data-i18n', key);
        sp.textContent = trim(text);
        el.appendChild(document.createTextNode(' '));
        el.appendChild(sp);
    }

    function tagSidebar(){
        var i, els;
        els = document.querySelectorAll('.sidebar-nav .sidebar-link');
        for(i = 0; i < els.length; i++){
            var key = navKey(els[i].getAttribute('href'));
            if(key){ wrapTextAfter(els[i], els[i].querySelector('.sidebar-link-icon'), key); }
        }
        els = document.querySelectorAll('.sidebar-section-title');
        for(i = 0; i < els.length; i++){
            var sk = SECTION_MAP[trim(els[i].textContent)];
            if(sk && !els[i].getAttribute('data-i18n')){ els[i].setAttribute('data-i18n', sk); }
        }
        els = document.querySelectorAll('.platform-badge');
        for(i = 0; i < els.length; i++){
            var bk = BADGE_MAP[trim(els[i].textContent)];
            if(bk){ wrapTextAfter(els[i], els[i].querySelector('.p-dot'), bk); }
        }
        var logo = document.querySelector('.sidebar-logo-text');
        if(logo && !logo.getAttribute('data-i18n-html')){ logo.setAttribute('data-i18n-html', 'sb_brand'); }

        // 테이블 헤더 <th> 자동 번역 (자식 요소 없는 순수 텍스트만)
        els = document.querySelectorAll('th');
        for(i = 0; i < els.length; i++){
            if(els[i].getAttribute('data-i18n') || els[i].children.length > 0){ continue; }
            var thk = TH_MAP[trim(els[i].textContent)];
            if(thk){ els[i].setAttribute('data-i18n', thk); }
        }

        // 상단바 제목 (텍스트 매칭 → 페이지별 자동 번역, 자식 요소 없는 순수 텍스트만)
        var tb = document.querySelector('.top-bar-title');
        if(tb && !tb.getAttribute('data-i18n') && tb.children.length === 0){
            var tk = TOPBAR_MAP[trim(tb.textContent)];
            if(tk){ tb.setAttribute('data-i18n', tk); }
        }
    }

    function injectSwitcher(){
        if(document.getElementById('dashLangSelect')){ return; }
        var bar = document.querySelector('.top-bar');
        if(!bar){ return; }
        var right = bar.querySelector('.top-bar-right');
        if(!right){ right = document.createElement('div'); right.className = 'top-bar-right'; bar.appendChild(right); }
        var sel = document.createElement('select');
        sel.id = 'dashLangSelect';
        sel.setAttribute('aria-label', 'Language');
        sel.style.cssText = 'padding:6px 10px;min-height:34px;border:1px solid #E2E8F0;border-radius:8px;background:#fff;color:#334155;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-right:6px';
        sel.innerHTML = '<option value="ko">🇰🇷 한국어</option><option value="en">🇺🇸 English</option><option value="zh">🇨🇳 中文</option><option value="vi">🇻🇳 Tiếng Việt</option>';
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
