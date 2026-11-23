import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from './languages';
import { loadGoogleMaps } from '@core/services/googleMapsLoader';
import { localizeAddressText } from './format';

/**
 * Display-only localisation of the current delivery location.
 *
 * `currentLocation.name` is stored and compared elsewhere (saved-address
 * matching, persistence), so it is never rewritten. This hook returns the same
 * place name as Google reverse-geocodes it in the selected language
 * (Hindi / Gujarati), and falls back to the stored name when the language is
 * English, the key/coords are missing, or the lookup fails.
 *
 * Results are cached per rounded coordinate + language to avoid repeat calls.
 */
const memoryCache = new Map();
const STORAGE_KEY = 'location_display_cache_v2';
const MAX_ENTRIES = 40;

const readStore = () => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
};

const writeStore = (key, value) => {
    try {
        const store = readStore();
        store[key] = value;
        const keys = Object.keys(store);
        if (keys.length > MAX_ENTRIES) delete store[keys[0]];
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        /* storage unavailable — memory cache still works */
    }
};

// The Maps JS SDK is loaded without a language, so the geocoder can answer in
// English even when we ask for hi/gu. Only accept a result that really is in
// the selected script; otherwise keep the transliterated stored name.
const SCRIPT = { hi: /[ऀ-ॿ]/, gu: /[઀-૿]/ };
const inScript = (text, lang) => !!text && !!SCRIPT[lang]?.test(text);

const buildName = (result) => {
    const components = result?.address_components || [];
    const get = (types) => components.find((c) => types.every((t) => c.types.includes(t)))?.long_name;
    const parts = [];
    const premise = get(['premise']);
    const neighborhood = get(['neighborhood']);
    const sublocality = get(['sublocality_level_1', 'sublocality']);
    const locality = get(['locality']);
    const state = get(['administrative_area_level_1']);
    const pincode = get(['postal_code']);
    const country = get(['country']);
    if (premise) parts.push(premise);
    if (neighborhood) parts.push(neighborhood);
    if (sublocality && sublocality !== neighborhood) parts.push(sublocality);
    if (locality) parts.push(locality);
    const statePin = [state, pincode].filter(Boolean).join(' ');
    if (statePin) parts.push(statePin);
    if (country) parts.push(country);
    return parts.join(', ') || result?.formatted_address || '';
};

export const useLocalizedLocationName = (location) => {
    // Same source as the rest of the translated UI (category names etc.).
    const { i18n } = useTranslation();
    const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language) || 'en';
    const original = location?.name || '';
    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const key = hasCoords ? `${lat.toFixed(4)},${lng.toFixed(4)}|${language}` : '';
    const [resolved, setResolved] = useState({ key: '', name: '' });

    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (language === 'en' || !hasCoords || !apiKey) return undefined;

        const cached = [memoryCache.get(key), readStore()[key]].find((v) => inScript(v, language));
        if (cached) {
            memoryCache.set(key, cached);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResolved({ key, name: cached });
            return undefined;
        }

        let cancelled = false;

        // Same path the location drawer uses (Maps JS SDK geocoder). Browser-
        // restricted keys usually reject the REST Geocoding endpoint, so REST is
        // only a fallback.
        const viaSdk = async () => {
            const maps = await loadGoogleMaps(apiKey);
            if (!maps?.Geocoder) return '';
            const geocoder = new maps.Geocoder();
            const { results } = await geocoder.geocode({ location: { lat, lng }, language });
            const built = buildName(results?.[0]);
            return inScript(built, language) ? built : '';
        };
        const viaRest = async () => {
            const params = new URLSearchParams({ latlng: `${lat},${lng}`, language, key: apiKey });
            const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
            const data = r.ok ? await r.json() : null;
            const built = data?.status === 'OK' ? buildName(data.results?.[0]) : '';
            return inScript(built, language) ? built : '';
        };

        (async () => {
            let name = '';
            try {
                name = await viaSdk();
            } catch {
                /* try REST below */
            }
            if (!name) {
                try {
                    name = await viaRest();
                } catch {
                    /* keep the stored name */
                }
            }
            if (!name || cancelled) return;
            memoryCache.set(key, name);
            writeStore(key, name);
            setResolved({ key, name });
        })();

        return () => {
            cancelled = true;
        };
    }, [key, language, hasCoords, lat, lng]);

    // TEMP-DEBUG (remove after diagnosis)
    const out = language === 'en'
        ? original
        : resolved.key === key && inScript(resolved.name, language)
            ? resolved.name
            : localizeAddressText(original, language);
    const dbgRef = useRef('');
    const dbgNow = JSON.stringify([language, i18n.language, i18n.resolvedLanguage, original, key, resolved, out]);
    if (dbgRef.current !== dbgNow) {
        dbgRef.current = dbgNow;
        // eslint-disable-next-line no-console
        console.log('[loc-debug]', { language, i18nLanguage: i18n.language, resolvedLanguage: i18n.resolvedLanguage, original, key, resolved, out, at: Math.round(performance.now()) });
    }
    if (language === 'en') return original;
    // Google's localized name when available, otherwise a transliteration of the stored name.
    return resolved.key === key && inScript(resolved.name, language)
        ? resolved.name
        : localizeAddressText(original, language);
};

export default useLocalizedLocationName;
