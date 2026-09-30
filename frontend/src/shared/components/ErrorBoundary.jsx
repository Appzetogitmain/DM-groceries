import React, { Component } from 'react';
import { AlertCircle, RefreshCw, Home, ShoppingBag } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-outfit">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                        <p className="text-gray-500 mb-6">
                            {this.state.error?.message || "An unexpected error occurred while loading the application."}
                        </p>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                style={{ backgroundColor: '#1A4516', color: '#ffffff' }}
                                className="w-full bg-[#1A4516] hover:bg-[#133A10] text-white font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1A4516]/25 cursor-pointer active:scale-98"
                            >
                                <RefreshCw className="w-5 h-5 text-white" />
                                <span className="text-white font-bold text-sm tracking-wide">Refresh Page</span>
                            </button>

                            <a
                                href="/"
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-2xl border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                            >
                                <Home className="w-5 h-5 text-slate-700" />
                                <span className="text-slate-800 font-bold text-sm tracking-wide">Back to Home</span>
                            </a>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                {new Date().toLocaleTimeString()} - System Error
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-primary font-semibold">
                        <ShoppingBag className="w-6 h-6" />
                        <span className="text-xl tracking-tight">App</span>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

