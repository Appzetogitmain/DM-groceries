import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Languages, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from './languages';

/**
 * Language picker (Customer and Seller panels) used for the first-visit prompt (mode="first", not
 * dismissible) and from Settings (mode="change", dismissible).
 *
 * The modal copy previews the highlighted language so users who cannot read
 * English still understand what they are confirming.
 */
const LanguageSelectionModal = ({ isOpen, mode = 'first', currentLanguage, onSelect, onClose }) => {
    const { i18n } = useTranslation();
    const [selected, setSelected] = useState(currentLanguage);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) setSelected(currentLanguage);
    }, [isOpen, currentLanguage]);

    const tp = i18n.getFixedT(selected);
    const dismissible = mode === 'change' && typeof onClose === 'function';

    const handleContinue = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onSelect?.(selected);
        } finally {
            setIsSaving(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="language-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={dismissible ? onClose : undefined}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="language-modal-title"
                >
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center pb-8 sm:pb-6"
                    >
                        {dismissible && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={tp('common.close')}
                                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}

                        <div className="w-16 h-16 bg-[#F5FBF5] text-[#1A4516] rounded-full flex items-center justify-center mb-4 shadow-sm border border-[#1A4516]/10">
                            <Languages size={30} />
                        </div>
                        <h2 id="language-modal-title" className="text-xl font-black text-slate-800 mb-2 tracking-tight">
                            {tp('language.selectTitle')}
                        </h2>
                        <p className="text-slate-500 text-sm mb-5 font-medium leading-relaxed">
                            {mode === 'first' ? tp('language.selectSubtitleFirst') : tp('language.selectSubtitleChange')}
                        </p>

                        <div className="w-full space-y-2.5 mb-6" role="radiogroup" aria-labelledby="language-modal-title">
                            {LANGUAGES.map((lang) => {
                                const isActive = selected === lang.code;
                                return (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        role="radio"
                                        aria-checked={isActive}
                                        lang={lang.code}
                                        onClick={() => setSelected(lang.code)}
                                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
                                            isActive
                                                ? 'border-[#1A4516] bg-[#F5FBF5]'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="flex flex-col">
                                            <span className={`text-base font-bold ${isActive ? 'text-[#1A4516]' : 'text-slate-800'}`}>
                                                {lang.nativeName}
                                            </span>
                                            {lang.nativeName !== lang.name && (
                                                <span className="text-xs font-medium text-slate-400">{lang.name}</span>
                                            )}
                                        </span>
                                        <span
                                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                                                isActive ? 'bg-[#1A4516] border-[#1A4516] text-white' : 'border-slate-300'
                                            }`}
                                        >
                                            {isActive && <Check size={14} strokeWidth={3} />}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={handleContinue}
                            disabled={isSaving}
                            className="w-full bg-[#1A4516] text-white font-bold py-3.5 rounded-xl hover:bg-[#11300F] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                        >
                            {isSaving ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : mode === 'first' ? tp('common.continue') : tp('common.save')}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default LanguageSelectionModal;
