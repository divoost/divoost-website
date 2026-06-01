const TRANSLATIONS = {
    ko: null,
    vi: null,
    en: null,
    zh: null
};

// lang/ 폴더는 i18n.js 와 동일한 부모(루트)에 위치
// 따라서 i18n.js 위치를 기준으로 상대 경로를 계산
function getLangBasePath() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || '';
        if (src.indexOf('i18n.js') >= 0) {
            // js/i18n.js 가 있는 디렉토리의 상위(=루트) + /lang/
            return src.replace(/js\/i18n\.js.*$/, 'lang/');
        }
    }
    return 'lang/';
}
var LANG_BASE = getLangBasePath();

const EMBEDDED_TRANSLATIONS_URL = {
    ko: LANG_BASE + 'ko.json',
    vi: LANG_BASE + 'vi.json',
    en: LANG_BASE + 'en.json',
    zh: LANG_BASE + 'zh.json'
};

let currentLang = 'ko';
let translationsCache = {};

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => {
        return acc && acc[key] !== undefined ? acc[key] : null;
    }, obj);
}

async function loadTranslation(lang) {
    if (translationsCache[lang]) {
        return translationsCache[lang];
    }

    try {
        const response = await fetch(EMBEDDED_TRANSLATIONS_URL[lang]);
        if (!response.ok) throw new Error('Failed to load translation');
        const data = await response.json();
        translationsCache[lang] = data;
        return data;
    } catch (error) {
        console.error(`Error loading ${lang} translations:`, error);
        return null;
    }
}

function applyTranslations(translations) {
    if (!translations) return;

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = getNestedValue(translations, key);

        if (value !== null) {
            if (typeof value === 'string' && value.includes('<')) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        }
    });

    const title = getNestedValue(translations, 'meta.title');
    if (title) {
        document.title = title;
    }
}

async function switchLanguage(lang) {
    if (lang === currentLang) return;

    const translations = await loadTranslation(lang);
    if (!translations) return;

    currentLang = lang;

    document.body.classList.remove('lang-ko', 'lang-vi', 'lang-en', 'lang-zh');
    document.body.classList.add(`lang-${lang}`);

    document.documentElement.lang = lang;

    localStorage.setItem('hubontrade_lang', lang);

    applyTranslations(translations);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const savedLang = localStorage.getItem('hubontrade_lang') || 'ko';

    const translations = await loadTranslation(savedLang);
    if (translations) {
        currentLang = savedLang;
        document.body.classList.add(`lang-${savedLang}`);
        document.documentElement.lang = savedLang;
        applyTranslations(translations);

        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === savedLang);
        });
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchLanguage(btn.dataset.lang);
        });
    });
});
