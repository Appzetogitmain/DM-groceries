import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Phone, Mail, MapPin, Clock, Send, Loader2, CheckCircle2 } from 'lucide-react';
import axiosInstance from '@core/api/axios';
import { useSettings } from '@core/context/SettingsContext';

const img = (name) => `/${encodeURIComponent(name)}`;
const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

const ContactPage = () => {
    const { settings } = useSettings();
    const appName = settings?.appName || 'DM Groceries';
    const email = settings?.supportEmail || 'support@dmgroceries.in';
    const phone = settings?.supportPhone || '+91 98765 43210';
    const address = settings?.address || 'Indore, Madhya Pradesh';

    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type, text }

    const onChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setFeedback(null);
        try {
            setSubmitting(true);
            const res = await axiosInstance.post('/contact', form);
            setFeedback({ type: 'success', text: res.data?.message || 'Thanks for reaching out!' });
            setForm(EMPTY);
        } catch (err) {
            setFeedback({ type: 'error', text: err.response?.data?.message || 'Could not send your message. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const info = [
        { icon: Phone, label: 'Call Us', value: phone, href: `tel:${String(phone).replace(/\s/g, '')}` },
        { icon: Mail, label: 'Email Us', value: email, href: `mailto:${email}` },
        { icon: MapPin, label: 'Visit Us', value: address },
        { icon: Clock, label: 'Support Hours', value: settings?.supportHours || 'Every day, 7:00 AM – 11:00 PM' }
    ];

    const inputCls = 'w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30';

    return (
        <div
            className="min-h-screen font-['Outfit',_sans-serif] bg-[#eef7e6] bg-cover bg-center bg-fixed"
            style={{ backgroundImage: `url("${img('sellerdeliverybg.png')}")` }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <Link
                    to="/"
                    aria-label="Back to home"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md hover:bg-green-50 transition-colors"
                >
                    <ChevronLeft size={22} />
                </Link>

                <header className="text-center -mt-4">
                    <img src={img('Logo.png')} alt={appName} className="mx-auto h-24 sm:h-32 w-auto object-contain" />
                    <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-slate-900">
                        Contact <span className="text-green-800">Us</span>
                    </h1>
                    <p className="mt-3 text-slate-600 max-w-xl mx-auto">
                        Have a question, feedback or need help with an order? Send us a message and we&apos;ll get back to you.
                    </p>
                </header>

                <div className="mt-10 grid lg:grid-cols-5 gap-6">
                    {/* Info */}
                    <div className="lg:col-span-2 space-y-4">
                        {info.map((item) => {
                            const Wrapper = item.href ? 'a' : 'div';
                            return (
                                <Wrapper
                                    key={item.label}
                                    {...(item.href ? { href: item.href } : {})}
                                    className="flex items-center gap-4 rounded-2xl bg-white/85 backdrop-blur border border-green-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                                >
                                    <span className="h-12 w-12 shrink-0 rounded-full bg-green-100 text-green-800 flex items-center justify-center">
                                        <item.icon size={22} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-xs tracking-widest uppercase text-slate-500">{item.label}</span>
                                        <span className="block font-semibold text-slate-900 break-words">{item.value}</span>
                                    </span>
                                </Wrapper>
                            );
                        })}
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={onSubmit}
                        className="lg:col-span-3 rounded-[2rem] bg-white/90 backdrop-blur border border-green-100 shadow-xl p-6 sm:p-8 space-y-4"
                    >
                        <h2 className="text-2xl font-extrabold text-green-900">Send us a message</h2>

                        {feedback && (
                            <p className={`flex items-start gap-2 text-sm font-medium rounded-lg px-4 py-3 ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                                {feedback.type === 'success' && <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                                {feedback.text}
                            </p>
                        )}

                        <div className="grid sm:grid-cols-2 gap-4">
                            <input required maxLength={80} value={form.name} onChange={onChange('name')} placeholder="Your name *" className={inputCls} />
                            <input type="email" maxLength={120} value={form.email} onChange={onChange('email')} placeholder="Email" className={inputCls} />
                            <input type="tel" maxLength={20} value={form.phone} onChange={onChange('phone')} placeholder="Phone number" className={inputCls} />
                            <input maxLength={120} value={form.subject} onChange={onChange('subject')} placeholder="Subject" className={inputCls} />
                        </div>
                        <textarea
                            required
                            minLength={10}
                            maxLength={1000}
                            rows={5}
                            value={form.message}
                            onChange={onChange('message')}
                            placeholder="How can we help you? *"
                            className={inputCls}
                        />
                        <p className="text-xs text-slate-500">Please provide at least an email or a phone number so we can reply.</p>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-full shadow-lg transition-colors"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {submitting ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
