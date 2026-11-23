/**
 * Customer-panel i18n tests.
 *
 * Covers:
 *   - en / hi / gu dictionaries have identical key sets and placeholders.
 *   - Every static t('…') key used in the customer module exists in English.
 *   - Language switching, English fallback for missing keys, interpolation
 *     and pluralization behave as expected with the bundled dictionaries.
 *   - languages.js normalisation helpers.
 */
import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import i18next from 'i18next';
import {
    LANGUAGES,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGE_CODES,
    normalizeLanguage,
    getIntlLocale,
} from '../../shared/i18n/languages.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CUSTOMER_DIR = path.resolve(here, '../../modules/customer');
const LOCALES_DIR = path.join(CUSTOMER_DIR, 'locales');
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

const readLocale = (code) =>
    JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, code, 'translation.json'), 'utf8'));

const flatten = (obj, prefix = '') =>
    Object.entries(obj).reduce((acc, [k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(acc, flatten(v, key));
        else acc[key] = v;
        return acc;
    }, {});

const baseKey = (k) => {
    const suffix = PLURAL_SUFFIXES.find((s) => k.endsWith(s));
    return suffix ? k.slice(0, -suffix.length) : k;
};

const placeholders = (value) =>
    typeof value === 'string'
        ? [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort()
        : [];

const dictionaries = Object.fromEntries(SUPPORTED_LANGUAGE_CODES.map((c) => [c, readLocale(c)]));
const flat = Object.fromEntries(Object.entries(dictionaries).map(([c, d]) => [c, flatten(d)]));

const makeInstance = (lng, overrides = {}) => {
    const instance = i18next.createInstance();
    const resources = Object.fromEntries(
        SUPPORTED_LANGUAGE_CODES.map((c) => [c, { translation: overrides[c] || dictionaries[c] }]),
    );
    instance.init({
        resources,
        lng,
        fallbackLng: DEFAULT_LANGUAGE,
        initAsync: false,
        interpolation: { escapeValue: false },
        returnEmptyString: false,
    });
    return instance;
};

describe('languages registry', () => {
    test('supports en, hi, mr with native names and English default', () => {
        expect(SUPPORTED_LANGUAGE_CODES).toEqual(['en', 'hi', 'gu']);
        expect(DEFAULT_LANGUAGE).toBe('en');
        expect(LANGUAGES.map((l) => l.nativeName)).toEqual(['English', 'हिंदी', 'ગુજરાતી']);
    });

    test('normalizeLanguage accepts supported codes and rejects others', () => {
        expect(normalizeLanguage('hi')).toBe('hi');
        expect(normalizeLanguage(' GU ')).toBe('gu');
        expect(normalizeLanguage('mr')).toBeNull();
        expect(normalizeLanguage('en-IN')).toBe('en');
        expect(normalizeLanguage('fr')).toBeNull();
        expect(normalizeLanguage('')).toBeNull();
        expect(normalizeLanguage(undefined)).toBeNull();
    });

    test('Gujarati dates keep Latin digits', () => {
        expect(getIntlLocale('gu')).toContain('nu-latn');
        expect(getIntlLocale('xx')).toBe('en-IN');
    });
});

describe('translation dictionaries', () => {
    const enBases = new Set(Object.keys(flat.en).map(baseKey));

    test.each(['hi', 'gu'])('%s has every English key', (code) => {
        const bases = new Set(Object.keys(flat[code]).map(baseKey));
        const missing = [...enBases].filter((k) => !bases.has(k));
        expect(missing).toEqual([]);
    });

    test.each(['hi', 'gu'])('%s has no keys that English lacks', (code) => {
        const extra = Object.keys(flat[code]).map(baseKey).filter((k) => !enBases.has(k));
        expect([...new Set(extra)]).toEqual([]);
    });

    test.each(['hi', 'gu'])('%s keeps the same interpolation placeholders', (code) => {
        const mismatches = [];
        for (const [key, value] of Object.entries(flat.en)) {
            const candidates = Object.keys(flat[code]).filter((k) => baseKey(k) === baseKey(key));
            for (const c of candidates) {
                if (placeholders(value).join() !== placeholders(flat[code][c]).join()) mismatches.push(c);
            }
        }
        expect([...new Set(mismatches)]).toEqual([]);
    });

    test.each(['hi', 'gu'])('%s has no empty strings', (code) => {
        const empty = Object.entries(flat[code]).filter(([, v]) => v === '').map(([k]) => k);
        expect(empty).toEqual([]);
    });

    test('every static t() key used in the customer module exists in English', () => {
        const missing = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name !== 'locales') walk(full);
                } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
                    const src = fs.readFileSync(full, 'utf8');
                    for (const m of src.matchAll(/\b(?:t|tp)\(\s*['"]([A-Za-z0-9_.]+)['"]/g)) {
                        const key = m[1];
                        if (!key.includes('.')) continue;
                        if (!enBases.has(key) && !(key in flat.en)) {
                            missing.push(`${path.relative(CUSTOMER_DIR, full)}: ${key}`);
                        }
                    }
                }
            }
        };
        walk(CUSTOMER_DIR);
        expect(missing).toEqual([]);
    });
});

describe('runtime behaviour', () => {
    test('switching language changes output immediately', async () => {
        const i18n = makeInstance('en');
        expect(i18n.t('nav.home')).toBe('Home');
        await i18n.changeLanguage('hi');
        expect(i18n.t('nav.home')).toBe(dictionaries.hi.nav.home);
        await i18n.changeLanguage('gu');
        expect(i18n.t('settings.language')).toBe('ભાષા');
        expect(i18n.t('language.selectTitle')).toBe('તમારી ભાષા પસંદ કરો');
    });

    test('missing key falls back to English', () => {
        const hiWithoutKey = JSON.parse(JSON.stringify(dictionaries.hi));
        delete hiWithoutKey.settings.subtitle;
        const i18n = makeInstance('hi', { hi: hiWithoutKey });
        expect(i18n.t('settings.subtitle')).toBe(dictionaries.en.settings.subtitle);
    });

    test('interpolation leaves dynamic data untouched', () => {
        const i18n = makeInstance('hi');
        const out = i18n.t('orders.orderNumber', { id: 'ORD-1234' });
        expect(out).toContain('ORD-1234');
        expect(i18n.t('cart.addedItem', { name: 'Fresh Milk' })).toContain('Fresh Milk');
    });

    test('pluralization works in all languages', () => {
        const en = makeInstance('en');
        expect(en.t('common.item', { count: 1 })).toBe('1 item');
        expect(en.t('common.item', { count: 3 })).toBe('3 items');
        const gu = makeInstance('gu');
        expect(gu.t('home.productsCount', { count: 1 })).toBe('1 ઉત્પાદન');
        expect(gu.t('home.productsCount', { count: 5 })).toBe('5 ઉત્પાદનો');
        const hi = makeInstance('hi');
        expect(hi.t('time.hoursAgo', { count: 1 })).toBe('1 घंटा पहले');
        expect(hi.t('time.hoursAgo', { count: 4 })).toBe('4 घंटे पहले');
    });

    test('unsupported language falls back to English', () => {
        const i18n = makeInstance('fr');
        expect(i18n.t('nav.home')).toBe('Home');
    });
});
