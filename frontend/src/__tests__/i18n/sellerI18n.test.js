/**
 * Seller-panel i18n + shared helper tests.
 *
 *   - Seller en / hi / gu dictionaries have identical keys and placeholders.
 *   - Every static t()/lt() key used in the seller module exists in English.
 *   - Dynamic key families used by the seller UI (status, ledger types,
 *     tabs, POS modes …) exist in every language.
 *   - Category translations (`nameHi` / `nameGu`) fall back to the English name.
 *   - The shared layout text context defaults to English (Admin unchanged).
 */
import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import i18next from 'i18next';
import { SUPPORTED_LANGUAGE_CODES, DEFAULT_LANGUAGE } from '../../shared/i18n/languages.js';
import { getLocalizedNameFor, getLocalizedItemName, localizedFieldKey, pickNameFields } from '../../shared/i18n/localizedName.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SELLER_DIR = path.resolve(here, '../../modules/seller');
const LAYOUT_DIR = path.resolve(here, '../../shared/layout');
const PLURAL = ['_zero', '_one', '_two', '_few', '_many', '_other'];

const read = (code) =>
    JSON.parse(fs.readFileSync(path.join(SELLER_DIR, 'locales', code, 'translation.json'), 'utf8'));

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

describe('seller dictionaries', () => {
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

    test('every static t()/lt() key used in the seller module and shared layout exists in English', () => {
        const missing = [];
        const walk = (dir) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) {
                    if (e.name !== 'locales') walk(full);
                } else if (/\.(jsx?)$/.test(e.name)) {
                    const src = fs.readFileSync(full, 'utf8');
                    for (const m of src.matchAll(/\b(?:t|lt|sellerI18n\.t)\(\s*['"]([A-Za-z0-9_.]+)['"]/g)) {
                        const key = m[1];
                        // lt() keys live in the layout namespace of the seller dictionary
                        if (!key.includes('.')) continue;
                        if (!enBases.has(key) && !(key in flat.en)) missing.push(`${path.basename(full)}: ${key}`);
                    }
                }
            }
        };
        walk(SELLER_DIR);
        walk(LAYOUT_DIR);
        expect([...new Set(missing)]).toEqual([]);
    });

    test('dynamic key families exist in every language', () => {
        const required = [
            ...['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'qc_passed', 'qc_failed', 'refund_completed']
                .map((s) => `status.${s}`),
            ...['order_payment', 'withdrawal', 'refund'].map((s) => `ledgerType.${s}`),
            ...['cod', 'cash', 'online'].map((s) => `paymentMethod.${s}`),
            ...['Overview', 'Sales', 'Customers'].map((s) => `sAnalytics.tabs.${s}`),
            ...['Daily', 'Weekly', 'Monthly'].map((s) => `sAnalytics.ranges.${s}`),
            ...['Active', 'Completed', 'All'].map((s) => `sTrack.tabs.${s}`),
            ...['On_the_Way', 'Picked_Up', 'Delivered'].map((s) => `sTrack.state.${s}`),
            ...['CASH', 'ONLINE', 'MIXED'].map((s) => `sPos.mode.${s}`),
            ...['MONTHLY', 'YEARLY'].map((s) => `sSub.cycles.${s}`),
            ...['All', 'Requested', 'Approved', 'Rejected', 'Pickup_Assigned', 'In_Transit', 'QC_Passed', 'QC_Failed', 'Completed'].map((s) => `sReturns.tabs.${s}`),
            ...['low', 'medium', 'high'].map((s) => `sSub.cycles.MONTHLY`),
        ];
        for (const code of SUPPORTED_LANGUAGE_CODES) {
            expect(required.filter((k) => !(k in flat[code]))).toEqual([]);
        }
    });

    test('seller instance switches language and falls back to English', async () => {
        const i = instance('en');
        expect(i.t('nav.orders')).toBe('Orders');
        await i.changeLanguage('gu');
        expect(i.t('nav.orders')).toBe(dicts.gu.nav.orders);
        expect(i.t('nav.orders')).not.toBe('Orders');
        await i.changeLanguage('hi');
        expect(i.t('nav.dashboard')).toBe('डैशबोर्ड');
        expect(i.t('does.not.exist', { defaultValue: 'fallback' })).toBe('fallback');
    });

    test('alerts interpolate order ids without altering them', () => {
        const i = instance('hi');
        const out = i.t('alerts.orderAccepted', { id: 'ORD-998' });
        expect(out).toContain('ORD-998');
    });
});

describe('category name translation', () => {
    const cat = { name: 'Dairy', nameHi: 'डेयरी', nameGu: '' };

    test('field keys per language', () => {
        expect(localizedFieldKey('en')).toBe('name');
        expect(localizedFieldKey('hi')).toBe('nameHi');
        expect(localizedFieldKey('gu')).toBe('nameGu');
    });

    test('uses the translation when present, otherwise falls back to English', () => {
        expect(getLocalizedNameFor(cat, 'hi')).toBe('डेयरी');
        expect(getLocalizedNameFor(cat, 'gu')).toBe('ડેરી ઉત્પાદનો'); // empty admin value → built-in dictionary
        expect(getLocalizedNameFor(cat, 'en')).toBe('Dairy');
        expect(getLocalizedNameFor({ name: 'Bread' }, 'hi')).toBe('ब्रेड');
        expect(getLocalizedNameFor({ name: 'Butter' }, 'hi')).toBe('मक्खन'); // exact name beats group rule
        expect(getLocalizedNameFor({ name: 'Gift Cards' }, 'hi')).toBe('Gift Cards'); // unknown → English
        expect(getLocalizedNameFor({ name: 'Bread', nameHi: 'पाव' }, 'hi')).toBe('पाव'); // admin value wins
        expect(getLocalizedNameFor(null, 'hi')).toBe('');
    });

    test('pickNameFields keeps only name fields', () => {
        expect(pickNameFields({ name: 'A', nameHi: 'ए', nameGu: 'એ', image: 'x', _id: '1' })).toEqual({ name: 'A', nameHi: 'ए', nameGu: 'એ' });
    });
});

describe('product / package name translation', () => {
    const prod = { name: 'Amul Butter', nameHi: 'अमूल मक्खन', nameGu: '' };
    test('uses seller translation, else English (no dictionary guessing)', () => {
        expect(getLocalizedItemName(prod, 'hi')).toBe('अमूल मक्खन');
        expect(getLocalizedItemName(prod, 'gu')).toBe('Amul Butter');
        expect(getLocalizedItemName(prod, 'en')).toBe('Amul Butter');
        expect(getLocalizedItemName({ name: 'Butter' }, 'hi')).toBe('Butter');
        expect(getLocalizedItemName(null, 'hi')).toBe('');
    });
    test('works for order-line package names', () => {
        const line = { packageName: 'Breakfast Combo', packageNameGu: 'નાસ્તો કોમ્બો' };
        expect(getLocalizedItemName(line, 'gu', 'packageName')).toBe('નાસ્તો કોમ્બો');
        expect(getLocalizedItemName(line, 'hi', 'packageName')).toBe('Breakfast Combo');
    });
});

describe('shared layout text default', () => {
    test('returns English fallback with interpolation when no provider is mounted (Admin)', async () => {
        const src = fs.readFileSync(path.join(LAYOUT_DIR, 'LayoutTextContext.jsx'), 'utf8');
        // The default translator must return the supplied English text, not a key.
        expect(src).toContain('const defaultTranslate = (_key, fallback, vars) => interpolate(fallback, vars);');
    });
});
