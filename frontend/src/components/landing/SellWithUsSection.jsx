import React, { useState } from 'react';
import { Check, CheckCircle2, Loader2 } from 'lucide-react';
import axiosInstance from '@core/api/axios';

const SELLER_BENEFITS = [
    'New customers, no ads cost',
    'Low & transparent seller commission',
    'Payment every week',
    'Our team lists your products for free'
];

const INITIAL_REGISTER_FORM = {
    shopName: '',
    ownerName: '',
    phone: '',
    area: '',
    categories: ''
};

const INITIAL_INFO_FORM = {
    ownerName: '',
    phone: '',
    question: ''
};

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-700/25 focus:border-green-700 transition-colors';

const labelCls = 'block text-xs font-bold text-slate-800 mb-1.5';

/**
 * Landing page "Sell with us" section for seller onboarding and inquiry leads.
 * Currently frontend-only; Phase 2 will wire handleSubmit to the backend API.
 */
const SellWithUsSection = ({ appName = 'DM Groceries' }) => {
    const [mode, setMode] = useState('register'); // 'register' | 'info'
    const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER_FORM);
    const [infoForm, setInfoForm] = useState(INITIAL_INFO_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submittedData, setSubmittedData] = useState(null);

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setError('');
        setSubmittedData(null);
    };

    const handlePhoneChange = (setter, prev) => (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
        setter({ ...prev, phone: digitsOnly });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (mode === 'register') {
            if (!registerForm.shopName.trim()) {
                setError('Please enter your shop name.');
                return;
            }
            if (!registerForm.ownerName.trim()) {
                setError('Please enter your name.');
                return;
            }
            if (registerForm.phone.length !== 10) {
                setError('Please enter a valid 10-digit mobile number.');
                return;
            }
            if (!registerForm.area.trim()) {
                setError('Please enter your area.');
                return;
            }

            try {
                setSubmitting(true);
                await axiosInstance.post('/seller-leads', registerForm);
                setSubmittedData({ type: 'register', ...registerForm });
                setRegisterForm(INITIAL_REGISTER_FORM);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                        'Could not submit your request. Please try again.'
                );
            } finally {
                setSubmitting(false);
            }
            return;
        }

        if (!infoForm.ownerName.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (infoForm.phone.length !== 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        try {
            setSubmitting(true);
            await axiosInstance.post('/seller-leads', {
                requestType: 'info',
                ...infoForm
            });
            setSubmittedData({ type: 'info', ...infoForm });
            setInfoForm(INITIAL_INFO_FORM);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    'Could not submit your request. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section
            id="sell-with-us"
            className="py-16 lg:py-24 bg-gradient-to-br from-[#eef7e6] via-[#f4faee] to-[#e9f5df] scroll-mt-20"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                {/* Left Column: Value Proposition */}
                <div className="lg:col-span-6">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                        Sell your shop&apos;s <br />
                        goods <br />
                        <span className="font-serif italic font-semibold text-green-800">
                            online
                        </span>
                    </h2>

                    <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
                        Reach new customers in Surat without paying for ads. We bring the orders, you pack and sell.
                    </p>

                    <ul className="mt-7 space-y-3.5">
                        {SELLER_BENEFITS.map((benefit) => (
                            <li
                                key={benefit}
                                className="flex items-center gap-3 text-slate-800 text-sm sm:text-base font-medium"
                            >
                                <span className="h-5 w-5 rounded-full bg-green-100 text-green-800 flex items-center justify-center shrink-0">
                                    <Check size={14} strokeWidth={2.75} />
                                </span>
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right Column: Onboarding / Inquiry Card */}
                <div className="lg:col-span-6">
                    <div className="bg-white rounded-3xl border border-green-100 shadow-xl p-6 sm:p-8 max-w-xl mx-auto lg:ml-auto">
                        {/* Segmented Tabs */}
                        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl gap-1">
                            <button
                                type="button"
                                onClick={() => switchMode('register')}
                                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                    mode === 'register'
                                        ? 'bg-green-800 text-white shadow-sm'
                                        : 'text-slate-700 hover:text-green-900'
                                }`}
                            >
                                Register now
                            </button>
                            <button
                                type="button"
                                onClick={() => switchMode('info')}
                                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                    mode === 'info'
                                        ? 'bg-green-800 text-white shadow-sm'
                                        : 'text-slate-700 hover:text-green-900'
                                }`}
                            >
                                I need more information
                            </button>
                        </div>

                        {submittedData ? (
                            <div className="py-10 text-center space-y-4">
                                <div className="mx-auto h-14 w-14 rounded-full bg-green-100 text-green-800 flex items-center justify-center">
                                    <CheckCircle2 size={30} />
                                </div>
                                <h3 className="text-xl font-extrabold text-green-900">
                                    Request received!
                                </h3>
                                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                                    Thank you, <span className="font-semibold text-slate-800">{submittedData.ownerName}</span>. Our onboarding team will call or WhatsApp you at{' '}
                                    <span className="font-semibold text-slate-800">+91 {submittedData.phone}</span> within 24 hours.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSubmittedData(null)}
                                    className="inline-flex items-center justify-center rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-900 text-sm font-semibold px-5 py-2.5 transition-colors"
                                >
                                    Submit another request
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                                <h3 className="text-xl font-extrabold text-green-900">
                                    {mode === 'register' ? 'Join as a seller' : 'Ask for more information'}
                                </h3>

                                {error && (
                                    <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-700">
                                        {error}
                                    </div>
                                )}

                                {mode === 'register' ? (
                                    <>
                                        <div>
                                            <label htmlFor="sell-shop-name" className={labelCls}>
                                                Shop name
                                            </label>
                                            <input
                                                id="sell-shop-name"
                                                type="text"
                                                maxLength={100}
                                                value={registerForm.shopName}
                                                onChange={(e) =>
                                                    setRegisterForm({ ...registerForm, shopName: e.target.value })
                                                }
                                                placeholder="e.g. Shree Ram Kirana"
                                                className={inputCls}
                                            />
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label htmlFor="sell-owner-name" className={labelCls}>
                                                    Your name
                                                </label>
                                                <input
                                                    id="sell-owner-name"
                                                    type="text"
                                                    maxLength={80}
                                                    value={registerForm.ownerName}
                                                    onChange={(e) =>
                                                        setRegisterForm({ ...registerForm, ownerName: e.target.value })
                                                    }
                                                    placeholder="Full name"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="sell-phone" className={labelCls}>
                                                    Phone
                                                </label>
                                                <input
                                                    id="sell-phone"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    value={registerForm.phone}
                                                    onChange={handlePhoneChange(setRegisterForm, registerForm)}
                                                    placeholder="10-digit mobile"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label htmlFor="sell-area" className={labelCls}>
                                                    Area
                                                </label>
                                                <input
                                                    id="sell-area"
                                                    type="text"
                                                    maxLength={80}
                                                    value={registerForm.area}
                                                    onChange={(e) =>
                                                        setRegisterForm({ ...registerForm, area: e.target.value })
                                                    }
                                                    placeholder="Varachha"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="sell-categories" className={labelCls}>
                                                    What do you sell?
                                                </label>
                                                <input
                                                    id="sell-categories"
                                                    type="text"
                                                    maxLength={120}
                                                    value={registerForm.categories}
                                                    onChange={(e) =>
                                                        setRegisterForm({ ...registerForm, categories: e.target.value })
                                                    }
                                                    placeholder="Kirana, vegetables, dairy.."
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label htmlFor="info-owner-name" className={labelCls}>
                                                    Your name
                                                </label>
                                                <input
                                                    id="info-owner-name"
                                                    type="text"
                                                    maxLength={80}
                                                    value={infoForm.ownerName}
                                                    onChange={(e) =>
                                                        setInfoForm({ ...infoForm, ownerName: e.target.value })
                                                    }
                                                    placeholder="Full name"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="info-phone" className={labelCls}>
                                                    Phone
                                                </label>
                                                <input
                                                    id="info-phone"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    value={infoForm.phone}
                                                    onChange={handlePhoneChange(setInfoForm, infoForm)}
                                                    placeholder="10-digit mobile"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="info-question" className={labelCls}>
                                                Your question (optional)
                                            </label>
                                            <textarea
                                                id="info-question"
                                                rows={3}
                                                maxLength={400}
                                                value={infoForm.question}
                                                onChange={(e) =>
                                                    setInfoForm({ ...infoForm, question: e.target.value })
                                                }
                                                placeholder="Ask about commission, payouts, or onboarding..."
                                                className={inputCls}
                                            />
                                        </div>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full inline-flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 disabled:opacity-60 text-white font-semibold text-sm sm:text-base py-3.5 rounded-xl transition-colors shadow-md"
                                >
                                    {submitting && <Loader2 size={18} className="animate-spin" />}
                                    {mode === 'register' ? 'Send my request' : 'Request a call back'}
                                </button>

                                <div className="text-center space-y-1.5 pt-1">
                                    <p className="text-xs text-slate-500">
                                        We will call or WhatsApp you within 24 hours.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => switchMode(mode === 'register' ? 'info' : 'register')}
                                        className="text-xs font-bold text-green-800 hover:underline"
                                    >
                                        {mode === 'register'
                                            ? 'Not sure yet? Ask for more information below'
                                            : 'Ready to register? Switch to Register now'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SellWithUsSection;

