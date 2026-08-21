import React from 'react';
import { ChevronLeft, ScrollText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';
import ReactMarkdown from 'react-markdown';

const TermsPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center gap-1 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800">Support</h1>
            </div>

            <div className="p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-primary">
                            <ScrollText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Support (Seller)</h2>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <div className="markdown-body text-sm text-slate-600 space-y-4">
                            {settings?.sellerTermsConditions ? (
                                <ReactMarkdown>
                                    {settings.sellerTermsConditions}
                                </ReactMarkdown>
                            ) : (
                                <p>By creating a seller account or using our platform, you agree to comply with our support policies.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
