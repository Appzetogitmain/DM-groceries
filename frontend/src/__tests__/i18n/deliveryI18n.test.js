/**
 * Delivery-panel i18n tests.
 *
 *   - en / hi / gu dictionaries have identical keys and placeholders.
 *   - Every static t() key used in the delivery module exists in English.
 *   - Language switching + English fallback work on an isolated instance.
 *   - Backend statuses resolve through labels.* with a raw-text fallback.
 */
import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import i18next from 'i18next';
import { SUPPORTED_LANGUAGE_CODES, DEFAULT_LANGUAGE } from '../../shared/i18n/languages.js';
import { transliterate } from '../../shared/i18n/transliterate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(here, '../../modules/delivery');
const PLURAL = ['_zero', '_one', '_two', '_few', '_many', '_other'];

const read = (code) => JSON.parse(fs.readFileSync(path.join(DIR, 'locales', code, 'translation.json'), 'utf8'));
const flatten = (obj, prefix = '') =>
    Object.entries(obj).reduce((acc, [k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(acc, flatten(v, key));
        else acc[key] = v;
        return acc;
    }, {});
const base = (k) => {
    const s = PLURAL.find((x) => k.endsWith(x));
    return s ? k.slice(0, -s.length) : k;
};
const ph = (v) => (typeof v === 'string' ? [...v.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort() : []);

const dicts = Object.fromEntries(SUPPORTED_LANGUAGE_CODES.map((c) => [c, read(c)]));
const flat = Object.fromEntries(Object.entries(dicts).map(([c, d]) => [c, flatten(d)]));
const enBases = new Set(Object.keys(flat.en).map(base));

const instance = (lng) => {
    const i = i18next.createInstance();
    i.init({
        resources: Object.fromEntries(SUPPORTED_LANGUAGE_CODES.map((c) => [c, { translation: dicts[c] }])),
        lng,
        fallbackLng: DEFAULT_LANGUAGE,
        initAsync: false,
        interpolation: { escapeValue: false },
    });
    return i;
};

describe('delivery dictionaries', () => {
    test.each(['hi', 'gu'])('%s has every English key and no extras', (code) => {
        const bases = new Set(Object.keys(flat[code]).map(base));
        expect([...enBases].filter((k) => !bases.has(k))).toEqual([]);
        expect([...bases].filter((k) => !enBases.has(k))).toEqual([]);
    });

    test.each(['hi', 'gu'])('%s keeps interpolation placeholders and has no empty values', (code) => {
        const bad = [];
        for (const [key, value] of Object.entries(flat.en)) {
            for (const c of Object.keys(flat[code]).filter((k) => base(k) === base(key))) {
                if (ph(value).join() !== ph(flat[code][c]).join()) bad.push(c);
            }
        }
        expect([...new Set(bad)]).toEqual([]);
        expect(Object.entries(flat[code]).filter(([, v]) => v === '').map(([k]) => k)).toEqual([]);
    });

    test('every static t() key used in the delivery module exists in English', () => {
        const missing = [];
        const walk = (dir) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) {
                    if (e.name !== 'locales') walk(full);
                } else if (/\.(jsx?)$/.test(e.name)) {
                    const src = fs.readFileSync(full, 'utf8');
                    for (const m of src.matchAll(/\b(?:t|deliveryI18n\.t)\(\s*['"]([A-Za-z0-9_.]+)['"]/g)) {
                        const key = m[1];
                        if (!key.includes('.')) continue;
                        if (!enBases.has(key) && !(key in flat.en)) missing.push(`${path.basename(full)}: ${key}`);
                    }
                }
            }
        };
        walk(DIR);
        expect([...new Set(missing)]).toEqual([]);
    });

    test('Hindi/Gujarati values are actually translated (not English copies) for core screens', () => {
        for (const code of ['hi', 'gu']) {
            expect(flat[code]['dBottomNav.home']).not.toBe(flat.en['dBottomNav.home']);
            expect(flat[code]['dDashboard.go_online']).not.toBe(flat.en['dDashboard.go_online']);
        }
    });
});

describe('delivery i18n instance', () => {
    test('switches language and falls back to English', async () => {
        const i = instance('en');
        expect(i.t('dBottomNav.home')).toBe('Home');
        await i.changeLanguage('hi');
        expect(i.t('dBottomNav.home')).toBe(dicts.hi.dBottomNav.home);
        await i.changeLanguage('gu');
        expect(i.t('dBottomNav.home')).toBe(dicts.gu.dBottomNav.home);
        expect(i.t('does.not.exist', { defaultValue: 'fallback' })).toBe('fallback');
    });

    test('plural keys resolve per count', async () => {
        const i = instance('en');
        expect(i.t('dOrderDetails.min_count', { count: 1 })).toBe('1 min');
        expect(i.t('dOrderDetails.min_count', { count: 5 })).toBe('5 mins');
        await i.changeLanguage('hi');
        expect(i.t('dOrderDetails.min_count', { count: 5 })).toContain('5');
    });

    test('status labels translate and unknown values fall back to raw text', async () => {
        const i = instance('hi');
        expect(i.t('labels.pending', { defaultValue: 'Pending' })).toBe(dicts.hi.labels.pending);
        expect(i.t('labels.some_new_status', { defaultValue: 'Some New Status' })).toBe('Some New Status');
    });
});

describe('address transliteration', () => {
    test('addresses render in Devanagari / Gujarati script while keeping numbers', () => {
        const hi = transliterate('Flat 12, Shyam Nagar, Indore, Madhya Pradesh 452001', 'hi');
        expect(hi).toMatch(/[\u0900-\u097F]/);
        expect(hi).toContain('452001');
        expect(hi).not.toMatch(/[A-Za-z]/);
        const gu = transliterate('Flat 12, Shyam Nagar, Indore, Madhya Pradesh 452001', 'gu');
        expect(gu).toMatch(/[\u0A80-\u0AFF]/);
    });
});
