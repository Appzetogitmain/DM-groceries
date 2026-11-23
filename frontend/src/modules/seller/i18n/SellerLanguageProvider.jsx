import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useAuth } from '@core/context/AuthContext';
import { rawSet, STORAGE_KEYS } from '@core/utils/storage';
import { LayoutTextContext } from '@/shared/layout/LayoutTextContext';
import LanguageSelectionModal from '@/shared/i18n/LanguageSelectionModal';
import { DEFAULT_LANGUAGE, getIntlLocale, normalizeLanguage } from '@/shared/i18n/languages';
import sellerI18n, { getStoredSellerLanguage } from './index';
import { sellerApi } from '../services/sellerApi';

/**
 * Seller-panel language provider. Same rules as the customer panel:
 *   1. Signed-in seller's saved profile preference (cross-device).
 *   2. Preference saved on this device.
 *   3. English.
 * First visit (nothing on device or account) shows the picker once.
 *
 * Also feeds translated strings to the shared dashboard layout through
 * LayoutTextContext (Admin keeps the English defaults).
 */
const SellerLanguageContext = createContext(null);

const persistLocal = (code) => rawSet(STORAGE_KEYS.SELLER_LANGUAGE, code);

export const SellerLanguageProvider = ({ children, promptOnFirstVisit = true }) => {
    const { user, role, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
    const [language, setLanguage] = useState(() => sellerI18n.language || DEFAULT_LANGUAGE);
    const [hasLocalChoice, setHasLocalChoice] = useState(() => Boolean(getStoredSellerLanguage()));
    const [pickerOpen, setPickerOpen] = useState(false);
    const syncedUserRef = useRef(null);

    const isSellerSession = role === 'seller' && isAuthenticated;
    const userId = user?._id || user?.id || null;
    const remoteLanguage = normalizeLanguage(user?.preferredLanguage);

    const applyLanguage = useCallback((code) => {
        const next = normalizeLanguage(code) || DEFAULT_LANGUAGE;
        persistLocal(next);
        setHasLocalChoice(true);
        if (sellerI18n.language !== next) sellerI18n.changeLanguage(next);
        setLanguage(next);
        return next;
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const previous = root.getAttribute('lang');
        root.setAttribute('lang', language);
        return () => {
            if (previous) root.setAttribute('lang', previous);
        };
    }, [language]);

    useEffect(() => {
        if (!isSellerSession || !userId) {
            if (!isAuthenticated) syncedUserRef.current = null;
            return;
        }
        if (syncedUserRef.current === userId) return;
        syncedUserRef.current = userId;

        if (remoteLanguage) {
            // Syncing with external state (the signed-in account).
            // eslint-disable-next-line react-hooks/set-state-in-effect
            applyLanguage(remoteLanguage);
            return;
        }
        const local = getStoredSellerLanguage();
        if (local) {
            sellerApi.updateProfile({ preferredLanguage: local })
                .then(() => updateUser({ preferredLanguage: local }))
                .catch(() => { /* non-fatal: retried on next sign-in */ });
        }
    }, [isSellerSession, isAuthenticated, userId, remoteLanguage, applyLanguage, updateUser]);

    const changeLanguage = useCallback(async (code) => {
        const next = applyLanguage(code);
        if (isSellerSession && remoteLanguage !== next) {
            try {
                await sellerApi.updateProfile({ preferredLanguage: next });
                updateUser({ preferredLanguage: next });
            } catch (error) {
                console.warn('[i18n] Failed to save seller language:', error?.message || error);
            }
        }
        return next;
    }, [applyLanguage, isSellerSession, remoteLanguage, updateUser]);

    const openLanguagePicker = useCallback(() => setPickerOpen(true), []);
    const closeLanguagePicker = useCallback(() => setPickerOpen(false), []);

    const needsFirstChoice = promptOnFirstVisit && !hasLocalChoice && !authLoading && !(isSellerSession && remoteLanguage);

    const value = useMemo(() => ({
        language,
        intlLocale: getIntlLocale(language),
        changeLanguage,
        openLanguagePicker,
        closeLanguagePicker,
    }), [language, changeLanguage, openLanguagePicker, closeLanguagePicker]);

    // Translator for the shared layout: uses seller keys, falls back to the English text.
    const layoutText = useCallback(
        (key, fallback, vars) => sellerI18n.t(key, { ...(vars || {}), defaultValue: fallback }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [language],
    );

    return (
        <I18nextProvider i18n={sellerI18n}>
            <SellerLanguageContext.Provider value={value}>
                <LayoutTextContext.Provider value={layoutText}>
                    {children}
                    <LanguageSelectionModal
                        isOpen={needsFirstChoice || pickerOpen}
                        mode={needsFirstChoice ? 'first' : 'change'}
                        currentLanguage={language}
                        onSelect={async (code) => {
                            await changeLanguage(code);
                            setPickerOpen(false);
                        }}
                        onClose={needsFirstChoice ? undefined : closeLanguagePicker}
                    />
                </LayoutTextContext.Provider>
            </SellerLanguageContext.Provider>
        </I18nextProvider>
    );
};

export const useSellerLanguage = () => {
    const ctx = useContext(SellerLanguageContext);
    if (!ctx) {
        const lang = sellerI18n.language || DEFAULT_LANGUAGE;
        return {
            language: lang,
            intlLocale: getIntlLocale(lang),
            changeLanguage: async () => lang,
            openLanguagePicker: () => {},
            closeLanguagePicker: () => {},
        };
    }
    return ctx;
};

export default SellerLanguageProvider;
