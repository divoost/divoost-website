/* DIVOOST SNS 다국어(i18n) 엔진 — ES5 호환, 전 페이지 공용
 *
 * 사용법:
 *   1) 페이지에서 이 스크립트보다 먼저 window.I18N_DICT 정의
 *        window.I18N_DICT = { ko:{key:'..'}, en:{key:'..'}, vi:{key:'..'} };
 *   2) <script src="js/i18n.js"></script> 포함
 *   3) 마크업에 속성 부여
 *        data-i18n       → textContent 교체
 *        data-i18n-html  → innerHTML 교체 (링크/strong 등 포함 텍스트)
 *        data-i18n-ph    → placeholder 교체
 *        data-i18n-title → title 속성 교체
 *   4) 언어 전환: I18N.setLang('en')  (localStorage 'snsLang'에 저장)
 *   5) 동적 문자열: I18N.t('key')
 */
(function(){
    'use strict';
    var LANGS = ['ko', 'en', 'vi'];
    var STORAGE_KEY = 'snsLang';

    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch(e){ saved = null; }
    var current = (saved && LANGS.indexOf(saved) > -1) ? saved : 'ko';

    function dictFor(lang){
        return (window.I18N_DICT && window.I18N_DICT[lang]) || {};
    }

    function t(key){
        var d = dictFor(current);
        if(d[key] != null){ return d[key]; }
        var ko = dictFor('ko');
        return ko[key] != null ? ko[key] : key; // 폴백: 한국어 → 키 자체
    }

    function apply(root){
        root = root || document;
        document.documentElement.lang = current;

        var i, els;
        els = root.querySelectorAll('[data-i18n]');
        for(i = 0; i < els.length; i++){ els[i].textContent = t(els[i].getAttribute('data-i18n')); }

        els = root.querySelectorAll('[data-i18n-html]');
        for(i = 0; i < els.length; i++){ els[i].innerHTML = t(els[i].getAttribute('data-i18n-html')); }

        els = root.querySelectorAll('[data-i18n-ph]');
        for(i = 0; i < els.length; i++){ els[i].setAttribute('placeholder', t(els[i].getAttribute('data-i18n-ph'))); }

        els = root.querySelectorAll('[data-i18n-title]');
        for(i = 0; i < els.length; i++){ els[i].setAttribute('title', t(els[i].getAttribute('data-i18n-title'))); }

        // 언어 선택 UI 동기화
        var sel = document.getElementById('langSelect');
        if(sel && sel.value !== current){ sel.value = current; }
    }

    function setLang(lang){
        if(LANGS.indexOf(lang) < 0){ return; }
        current = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){ /* 저장 실패 무시: 비공개 모드 등 */ }
        apply(document);
        if(typeof window.onI18nChange === 'function'){ window.onI18nChange(lang); }
    }

    function getLang(){ return current; }

    window.I18N = { t: t, apply: apply, setLang: setLang, getLang: getLang, langs: LANGS };

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', function(){ apply(document); });
    } else {
        apply(document);
    }
})();
