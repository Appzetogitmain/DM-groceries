import React, { useState } from 'react';
import { Check, CheckCircle2, Loader2 } from 'lucide-react';
import axiosInstance from '@core/api/axios';

const DELIVERY_BENEFITS = [
    'Competitive pay per delivery',
    'Guaranteed daily minimum in month 1',
    'Part-time or full-time, you choose',
    'Work close to your home'
];

const INITIAL_REGISTER_FORM = {
    fullName: '',
    phone: '',
    area: '',
    vehicle: '',
    drivingLicence: '',
    workShift: ''
};

const INITIAL_INFO_FORM = {
    fullName: '',
    phone: '',
    question: ''
};

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-700/25 focus:border-green-700 transition-colors';

const labelCls = 'block text-xs font-bold text-slate-800 mb-1.5';

/**
 * Landing page "Deliver with us" section for delivery partner onboarding & inquiry leads.
 */
const DeliverWithUsSection = () => {
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
            if (!registerForm.fullName.trim()) {
                setError('Please enter your full name.');
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
            if (!registerForm.vehicle.trim()) {
                setError('Please enter your vehicle type.');
                return;
            }
            if (!registerForm.drivingLicence.trim()) {
                setError('Please specify whether you have a driving licence.');
                return;
            }

            try {
                setSubmitting(true);
                await axiosInstance.post('/delivery-leads', registerForm);
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

        if (!infoForm.fullName.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (infoForm.phone.length !== 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        try {
            setSubmitting(true);
            await axiosInstance.post('/delivery-leads', {
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
            id="deliver-with-us"
            className="py-16 lg:py-24 bg-gradient-to-br from-[#f4faee] via-white to-[#eef7e6] border-t border-green-100 scroll-mt-20"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                {/* Left Column: Value Proposition */}
                <div className="lg:col-span-6">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                        Earn with <br />
                        <span className="font-serif italic font-semibold text-green-800">
                            your bike
                        </span>
                    </h2>

                    <p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
                        Deliver groceries in your own area. Choose your hours and earn on every delivery.
                    </p>

                    <ul className="mt-7 space-y-3.5">
                        {DELIVERY_BENEFITS.map((benefit) => (
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
                                    Thank you, <span className="font-semibold text-slate-800">{submittedData.fullName}</span>. Our onboarding team will call or WhatsApp you at{' '}
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
                                    {mode === 'register'
                                        ? 'Join as a delivery partner'
                                        : 'Ask for more information'}
                                </h3>

                                {error && (
                                    <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-700">
                                        {error}
                                    </div>
                                )}

                                {mode === 'register' ? (
                                    <>
                                        <div>
                                            <label htmlFor="deliver-full-name" className={labelCls}>
                                                Full name
                                            </label>
                                            <input
                                                id="deliver-full-name"
                                                type="text"
                                                maxLength={80}
                                                value={registerForm.fullName}
                                                onChange={(e) =>
                                                    setRegisterForm({
                                                        ...registerForm,
                                                        fullName: e.target.value
                                                    })
                                                }
                                                placeholder="Your name"
                                                className={inputCls}
                                            />
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label htmlFor="deliver-phone" className={labelCls}>
                                                    Phone
                                                </label>
                                                <input
                                                    id="deliver-phone"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    value={registerForm.phone}
                                                    onChange={handlePhoneChange(
                                                        setRegisterForm,
                                                        registerForm
                                                    )}
                                                    placeholder="10-digit mobile"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="deliver-area" className={labelCls}>
                                                    Area
                                                </label>
                                                <input
                                                    id="deliver-area"
                                                    type="text"
                                                    maxLength={80}
                                                    value={registerForm.area}
                                                    onChange={(e) =>
                                                        setRegisterForm({
                                                            ...registerForm,
                                                            area: e.target.value
                                                        })
                                                    }
                                                    placeholder="Varachha"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label htmlFor="deliver-vehicle" className={labelCls}>
                                                    Vehicle
                                                </label>
                                                <input
                                                    id="deliver-vehicle"
                                                    type="text"
                                                    maxLength={40}
                                                    value={registerForm.vehicle}
                                                    onChange={(e) =>
                                                        setRegisterForm({
                                                            ...registerForm,
                                                            vehicle: e.target.value
                                                        })
                                                    }
                                                    placeholder="Bike / Scooter / Cycle"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="deliver-licence" className={labelCls}>
                                                    Driving licence?
                                                </label>
                                                <input
                                                    id="deliver-licence"
                                                    type="text"
                                                    maxLength={20}
                                                    value={registerForm.drivingLicence}
                                                    onChange={(e) =>
                                                        setRegisterForm({
                                                            ...registerForm,
                                                            drivingLicence: e.target.value
                                                        })
                                                    }
                                                    placeholder="Yes / No"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="deliver-shift" className={labelCls}>
                                                When can you work?
                                            </label>
                                            <input
                                                id="deliver-shift"
                                                type="text"
                                                maxLength={80}
                                                value={registerForm.workShift}
                                                onChange={(e) =>
                                                    setRegisterForm({
                                                        ...registerForm,
                                                        workShift: e.target.value
                                                    })
                                                }
                                                placeholder="Morning / Afternoon / Evening / Full day"
                                                className={inputCls}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label htmlFor="deliver-info-name" className={labelCls}>
                                                    Full name
                                                </label>
                                                <input
                                                    id="deliver-info-name"
                                                    type="text"
                                                    maxLength={80}
                                                    value={infoForm.fullName}
                                                    onChange={(e) =>
                                                        setInfoForm({
                                                            ...infoForm,
                                                            fullName: e.target.value
                                                        })
                                                    }
                                                    placeholder="Your name"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="deliver-info-phone" className={labelCls}>
                                                    Phone
                                                </label>
                                                <input
                                                    id="deliver-info-phone"
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
                                            <label htmlFor="deliver-info-question" className={labelCls}>
                                                Your question (optional)
                                            </label>
                                            <textarea
                                                id="deliver-info-question"
                                                rows={3}
                                                maxLength={400}
                                                value={infoForm.question}
                                                onChange={(e) =>
                                                    setInfoForm({
                                                        ...infoForm,
                                                        question: e.target.value
                                                    })
                                                }
                                                placeholder="Ask about payouts, shift timings, or documents..."
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

export default DeliverWithUsSection;

