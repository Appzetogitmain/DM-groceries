import React from 'react';
import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router-dom';
import { ShoppingBag, RefreshCw, Home, AlertCircle } from 'lucide-react';
import { useSettings } from '@core/context/SettingsContext';

const RootErrorBoundary = () => {
    const error = useRouteError();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    console.error('Route Error:', error);

    let errorMessage = "An unexpected error occurred.";
    let errorStatus = 500;

    let isChunkError = false;
    if (isRouteErrorResponse(error)) {
        errorStatus = error.status;
        errorMessage = error.statusText || error.data?.message || errorMessage;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    if (
        typeof errorMessage === 'string' &&
        (errorMessage.includes('Failed to fetch dynamically imported module') ||
         errorMessage.includes('Importing a module script failed') ||
         errorMessage.includes('dynamically imported module') ||
         errorMessage.includes('Loading chunk'))
    ) {
        isChunkError = true;
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-outfit">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-200">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                </div>

                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                    {isChunkError ? "App Updated!" : "Oops!"}
                </h1>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {isChunkError
                        ? "A newer version of the application was recently deployed. Please refresh the page to load the latest features."
                        : errorMessage}
                </p>

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        style={{ backgroundColor: '#1A4516', color: '#ffffff' }}
                        className="w-full bg-[#1A4516] hover:bg-[#133A10] text-white font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1A4516]/25 cursor-pointer active:scale-98"
                    >
                        <RefreshCw className="w-5 h-5 text-white animate-spin-reverse" />
                        <span className="text-white font-bold text-sm tracking-wide">
                            {isChunkError ? "Update & Refresh Page" : "Refresh Page"}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-2xl border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                        <Home className="w-5 h-5 text-slate-700" />
                        <span className="text-slate-800 font-bold text-sm tracking-wide">Back to Home</span>
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400">
                        Error ID: {errorStatus} - {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-[#1A4516] font-bold">
                <ShoppingBag className="w-6 h-6 text-[#1A4516]" />
                <span className="text-xl tracking-tight text-slate-900 font-extrabold">{appName}</span>
            </div>
        </div>
    );
};

export default RootErrorBoundary;
