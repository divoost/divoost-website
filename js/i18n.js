// =========================================
// i18n - Internationalization
// =========================================

// Inline translations to avoid CORS issues when opening index.html directly (file://)
// These work both on GitHub Pages and when opening the file locally
const TRANSLATIONS = {
    ko: null,
    vi: null,
    en: null
};

// Translations are loaded from lang/*.json via fetch when served over HTTP (GitHub Pages).
// When opened locally via file://, fetch may fail; we fall back to embedded translations.
const EMBEDDED_TRANSLATIONS_URL = {
    ko: 'lang/ko.json',
    vi: 'lang/vi.json',
    en: 'lang/en.json'
};

let currentLang = 'ko';
let translationsCache = {};

// Get nested value from object using dot notation (e.g., "nav.home")
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => {
        return acc && acc[key] !== undefined ? acc[key] : null;
    }, obj);
}

// Load translation file
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

// Apply translations to all elements with data-i18n attribute
function applyTranslations(translations) {
    if (!translations) return;

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = getNestedValue(translations, key);

        if (value !== null) {
            // Check if the value contains HTML (like <br>)
            if (typeof value === 'string' && value.includes('<')) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        }
    });

    // Update document title
    const title = getNestedValue(translations, 'meta.title');
    if (title) {
        document.title = title;
    }
}

// Switch language
async function switchLanguage(lang) {
    if (lang === currentLang) return;

    const translations = await loadTranslation(lang);
    if (!translations) return;

    currentLang = lang;

    // Update body class for font switching
    document.body.classList.remove('lang-ko', 'lang-vi', 'lang-en');
    document.body.classList.add(`lang-${lang}`);

    // Update html lang attribute
    document.documentElement.lang = lang;

    // Save preference
    localStorage.setItem('divoost_lang', lang);

    // Apply translations
    applyTranslations(translations);

    // Update active state of language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

// Initialize i18n on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    // Get saved language or default to Korean
    const savedLang = localStorage.getItem('divoost_lang') || 'ko';

    // Load initial translations
    const translations = await loadTranslation(savedLang);
    if (translations) {
        currentLang = savedLang;
        document.body.classList.add(`lang-${savedLang}`);
        document.documentElement.lang = savedLang;
        applyTranslations(translations);

        // Update active state
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === savedLang);
        });
    }

    // Attach language switcher handlers
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchLanguage(btn.dataset.lang);
        });
    });
});
