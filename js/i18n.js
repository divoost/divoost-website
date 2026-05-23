const TRANSLATIONS = {
    ko: null,
    vi: null,
    en: null,
    zh: null
};

const EMBEDDED_TRANSLATIONS_URL = {
    ko: 'lang/ko.json',
    vi: 'lang/vi.json',
    en: 'lang/en.json',
    zh: 'lang/zh.json'
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

    localStorage.setItem('ezcomet_lang', lang);

    applyTranslations(translations);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const savedLang = localStorage.getItem('ezcomet_lang') || 'ko';

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
