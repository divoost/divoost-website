/* 소싱 대시보드 다국어(i18n) 엔진 — ES5, 전 페이지 공용 (ko/en/zh/vi)
 * 사용법: window.I18N_DICT(페이지) + window.I18N_COMMON(공통) 정의 후 이 스크립트 로드.
 *   data-i18n / data-i18n-html / data-i18n-ph / data-i18n-title 속성 자동 치환.
 *   I18N.setLang('en'|'zh'|'vi'|'ko'), I18N.t('key').
 */
(function(){
    'use strict';
    var LANGS = ['ko', 'en', 'zh', 'vi'];
    var STORAGE_KEY = 'dashLang';

    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch(e){ saved = null; }
    var current = (saved && LANGS.indexOf(saved) > -1) ? saved : 'ko';

    function dictFor(lang){
        var common = (window.I18N_COMMON && window.I18N_COMMON[lang]) || {};
        var page = (window.I18N_DICT && window.I18N_DICT[lang]) || {};
        var out = {}, k;
        for(k in common){ if(common.hasOwnProperty(k)){ out[k] = common[k]; } }
        for(k in page){ if(page.hasOwnProperty(k)){ out[k] = page[k]; } }
        return out;
    }

    function t(key){
        var d = dictFor(current);
        if(d[key] != null){ return d[key]; }
        var ko = dictFor('ko');
        return ko[key] != null ? ko[key] : key;
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
        var sel = document.getElementById('dashLangSelect');
        if(sel && sel.value !== current){ sel.value = current; }
    }

    function setLang(lang){
        if(LANGS.indexOf(lang) < 0){ return; }
        current = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){ /* private mode 무시 */ }
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
