import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useAuth } from '@core/context/AuthContext';
import { rawSet, STORAGE_KEYS } from '@core/utils/storage';
import customerI18n, { getStoredLanguage } from './index';
import { DEFAULT_LANGUAGE, getIntlLocale, normalizeLanguage } from './languages';
import { customerApi } from '../services/customerApi';
import LanguageSelectionModal from '../components/shared/LanguageSelectionModal';

/**
 * Language preference precedence:
 *   1. Authenticated customer's saved profile preference (cross-device).
 *   2. Preference saved on this device (localStorage).
 *   3. DEFAULT_LANGUAGE (English).
 *
 * A first-time visitor (no device preference and no profile preference) sees
 * the language picker once. The profile is only written when the customer
 * actively picks a language, or once after login when the account has no
 * preference yet but the device does — never with an implicit default.
 */
const CustomerLanguageContext = createContext(null);

const persistLocal = (code) => rawSet(STORAGE_KEYS.CUSTOMER_LANGUAGE, code);

export const CustomerLanguageProvider = ({ children }) => {
    const { user, role, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
    const [language, setLanguage] = useState(() => customerI18n.language || DEFAULT_LANGUAGE);
    const [hasLocalChoice, setHasLocalChoice] = useState(() => Boolean(getStoredLanguage()));
    const [pickerMode, setPickerMode] = useState(null); // null | 'change'
    const syncedUserRef = useRef(null);

    const isCustomerSession = role === 'customer' && isAuthenticated;
    const userId = user?._id || user?.id || null;
    const remoteLanguage = normalizeLanguage(user?.preferredLanguage);

    const applyLanguage = useCallback((code) => {
        const next = normalizeLanguage(code) || DEFAULT_LANGUAGE;
        persistLocal(next);
        setHasLocalChoice(true);
        if (customerI18n.language !== next) customerI18n.changeLanguage(next);
        setLanguage(next);
        return next;
    }, []);

    // Follow language changes made directly on the i18n instance (e.g. init/detection).
    useEffect(() => {
        const onChange = (lng) => setLanguage(normalizeLanguage(lng) || DEFAULT_LANGUAGE);
        customerI18n.on('languageChanged', onChange);
        if (normalizeLanguage(customerI18n.language) && normalizeLanguage(customerI18n.language) !== language) onChange(customerI18n.language);
        return () => customerI18n.off('languageChanged', onChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep <html lang> in sync while the customer panel is mounted.
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.getAttribute('lang');
        root.setAttribute('lang', language);
        return () => {
            if (previous) root.setAttribute('lang', previous);
        };
    }, [language]);

    // Restore / reconcile with the account preference once per signed-in user.
    useEffect(() => {
        if (!isCustomerSession || !userId) {
            if (!isAuthenticated) syncedUserRef.current = null;
            return;
        }
        if (syncedUserRef.current === userId) return;
        syncedUserRef.current = userId;

        if (remoteLanguage) {
            // Syncing with external state (the signed-in account), not derived UI state.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            applyLanguage(remoteLanguage);
            return;
        }
        const local = getStoredLanguage();
        if (local) {
            customerApi.updateProfile({ preferredLanguage: local })
                .then(() => updateUser({ preferredLanguage: local }))
                .catch(() => { /* non-fatal: retried on next sign-in */ });
        }
    }, [isCustomerSession, isAuthenticated, userId, remoteLanguage, applyLanguage, updateUser]);

    const changeLanguage = useCallback(async (code) => {
        const next = applyLanguage(code);
        if (isCustomerSession && remoteLanguage !== next) {
            try {
                await customerApi.updateProfile({ preferredLanguage: next });
                updateUser({ preferredLanguage: next });
            } catch (error) {
                // The device keeps the new language; the account syncs on a later change.
                console.warn('[i18n] Failed to save language preference:', error?.message || error);
            }
        }
        return next;
    }, [applyLanguage, isCustomerSession, remoteLanguage, updateUser]);

    const openLanguagePicker = useCallback(() => setPickerMode('change'), []);
    const closeLanguagePicker = useCallback(() => setPickerMode(null), []);

    // First visit: nothing on this device and (once auth settles) nothing on the account.
    const needsFirstChoice = !hasLocalChoice && !authLoading && !(isCustomerSession && remoteLanguage);
    const isPickerOpen = needsFirstChoice || pickerMode !== null;

    const value = useMemo(() => ({
        language,
        intlLocale: getIntlLocale(language),
        changeLanguage,
        openLanguagePicker,
        closeLanguagePicker,
    }), [language, changeLanguage, openLanguagePicker, closeLanguagePicker]);

    return (
        <I18nextProvider i18n={customerI18n}>
            <CustomerLanguageContext.Provider value={value}>
                {children}
                <LanguageSelectionModal
                    isOpen={isPickerOpen}
                    mode={needsFirstChoice ? 'first' : 'change'}
                    currentLanguage={language}
                    onSelect={async (code) => {
                        await changeLanguage(code);
                        setPickerMode(null);
                    }}
                    onClose={needsFirstChoice ? undefined : closeLanguagePicker}
                />
            </CustomerLanguageContext.Provider>
        </I18nextProvider>
    );
};

export const useCustomerLanguage = () => {
    const ctx = useContext(CustomerLanguageContext);
    if (!ctx) {
        // Rendered outside the customer panel (should not happen) — degrade gracefully.
        const lang = customerI18n.language || DEFAULT_LANGUAGE;
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

export default CustomerLanguageProvider;
