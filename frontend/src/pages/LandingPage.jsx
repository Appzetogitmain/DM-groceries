import React, { useRef, useState, useEffect } from 'react';
import axiosInstance from '@core/api/axios';
import { Link } from 'react-router-dom';
import {
    ShoppingBasket,
    Leaf,
    ShieldCheck,
    BadgePercent,
    Headphones,
    Download,
    MapPin,
    ShoppingCart,
    Bike,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    ArrowRight,
    Star,
    Phone,
    Mail,
    Play,
    Apple
} from 'lucide-react';
import { useSettings } from '@core/context/SettingsContext';

const img = (name) => `/${encodeURIComponent(name)}`;
const HERO_BANNER = img('landing apge banner.png');
const MID_BANNER = img('landing page banner2.png');
const FOOTER_BG = img('footer bg.png');
const LOGO = img('Logo.png');

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dmgroceries.user';

const phoneScreens = [
    { src: img('mobile image 2.png'), alt: 'DM Groceries login screen' },
    { src: img('mobile iamge middle.png'), alt: 'DM Groceries home screen' },
    { src: img('mobile image3.png'), alt: 'DM Groceries checkout screen' }
];

const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#why' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how' },
    { label: 'Categories', href: '#categories' },
    { label: 'Contact', href: '/contact' }
];

const whyItems = [
    { icon: Leaf, title: '100% Fresh Products', desc: 'Handpicked fresh groceries for your family' },
    { icon: ShoppingBasket, title: 'Wide Range of Items', desc: 'From fresh produce to daily essentials' },
    { icon: ShieldCheck, title: 'Fast Delivery (12-15 mins)', desc: 'Get your groceries delivered quickly' },
    { icon: BadgePercent, title: 'Best Prices & Offers', desc: 'Great deals and exclusive discounts' },
    { icon: Headphones, title: 'Easy Returns & Support', desc: 'Hassle-free support whenever you need' }
];

const steps = [
    { icon: Download, title: 'Download App', desc: 'Install DM Groceries app from Play Store or App Store' },
    { icon: MapPin, title: 'Choose Location', desc: 'Set your delivery location' },
    { icon: ShoppingCart, title: 'Add to Cart', desc: 'Browse and add your favorite products' },
    { icon: Bike, title: 'Get Delivered', desc: 'Receive fresh groceries at your doorstep' }
];

const appFeatures = [
    'Wide range of fresh products',
    'Exclusive offers & discounts',
    'Easy search & filter',
    'Secure and multiple payment options',
    'Real-time order tracking'
];

const categories = [
    { name: 'Fruits & Vegetables', emoji: '🥗' },
    { name: 'Dairy & Breads', emoji: '🥛' },
    { name: 'Atta, Rice & Dal', emoji: '🌾' },
    { name: 'Masala & Spices', emoji: '🌶️' },
    { name: 'Snacks & Beverages', emoji: '🍿' },
    { name: 'Personal Care', emoji: '🧴' },
    { name: 'Household Essentials', emoji: '🧽' }
];

// In-page section anchors (#why) stay plain <a>; route paths (/contact) use client-side navigation.
const NavAnchor = ({ href, className, children }) =>
    href.startsWith('/')
        ? <Link to={href} className={className}>{children}</Link>
        : <a href={href} className={className}>{children}</a>;

const EMPTY_TESTIMONIAL ={ name: '', city: '', rating: 5, message: '' };

const StoreButtons = ({ className = '' }) => (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
        <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-black text-white rounded-lg px-4 py-2 border border-white/20 hover:bg-neutral-800 transition-colors shadow-sm"
        >
            <Play size={22} className="fill-white" />
            <span className="leading-tight text-left">
                <span className="block text-[9px] uppercase tracking-wide">Get it on</span>
                <span className="block text-base font-semibold">Google Play</span>
            </span>
        </a>
        <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-black text-white rounded-lg px-4 py-2 border border-white/20 hover:bg-neutral-800 transition-colors shadow-sm"
        >
            <Apple size={24} className="fill-white" />
            <span className="leading-tight text-left">
                <span className="block text-[9px] tracking-wide">Download on the</span>
                <span className="block text-base font-semibold">App Store</span>
            </span>
        </a>
    </div>
);

const LandingPage = () => {
    const { settings } = useSettings();
    const appName = settings?.appName || 'DM Groceries';
    const catRef = useRef(null);
    const contactPhone = settings?.supportPhone || '+91 98765 43210';
    const contactEmail = settings?.supportEmail || 'support@dmgroceries.in';

    // Testimonials: approved ones are loaded from the API (managed by admin)
    const [reviews, setReviews] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_TESTIMONIAL);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text }

    useEffect(() => {
        let cancelled = false;
        axiosInstance
            .get('/testimonials', { params: { limit: 12 } })
            .then((res) => {
                if (!cancelled) setReviews(res.data?.result?.items || []);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const submitTestimonial = async (e) => {
        e.preventDefault();
        setFeedback(null);
        try {
            setSubmitting(true);
            const res = await axiosInstance.post('/testimonials', form);
            setFeedback({ type: 'success', text: res.data?.message || 'Thank you! Your testimonial will appear once approved.' });
            setForm(EMPTY_TESTIMONIAL);
            setShowForm(false);
        } catch (err) {
            setFeedback({ type: 'error', text: err.response?.data?.message || 'Could not submit. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const scrollCats = (dir) => {
        catRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-white text-slate-800 font-['Outfit',_sans-serif] scroll-smooth selection:bg-green-700 selection:text-white">
            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-green-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
                    <a href="#home" className="flex items-center shrink-0">
                        <img src={LOGO} alt={appName} className="h-11 sm:h-14 w-auto object-contain" />
                    </a>

                    <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-700">
                        {navLinks.map((l, i) => (
                            <NavAnchor
                                key={l.label}
                                href={l.href}
                                className={`py-1 hover:text-green-800 transition-colors ${i === 0 ? 'text-green-800 border-b-2 border-green-800' : ''
                                    }`}
                            >
                                {l.label}
                            </NavAnchor>
                        ))}
                    </nav>

                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-lg transition-colors shadow-md"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Download App</span>
                        <span className="sm:hidden">Download</span>
                    </a>
                </div>
            </header>

            <main>
                {/* Hero banner */}
                <section id="home" className="bg-[#eef7e6]">
                    <img
                        src={HERO_BANNER}
                        alt="Fresh groceries delivered to you"
                        className="w-full h-auto block"
                    />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <StoreButtons />
                        <Link
                            to="/user"
                            className="inline-flex items-center gap-2 text-green-800 font-semibold hover:underline"
                        >
                            Start shopping on web <ArrowRight size={16} />
                        </Link>
                    </div>
                </section>

                {/* Why choose */}
                <section id="why" className="py-14 bg-gradient-to-b from-[#f4faee] to-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-green-900">
                                Why Choose <span className="text-green-700">{appName}</span>?
                            </h2>
                            <p className="text-slate-600 mt-3 text-sm sm:text-base">
                                We bring farm-fresh fruits, vegetables and daily essentials to your home with the best quality, great prices and fast delivery.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {whyItems.map((item) => (
                                <div
                                    key={item.title}
                                    className="bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all p-5 text-center"
                                >
                                    <div className="mx-auto h-14 w-14 rounded-full bg-green-100 text-green-800 flex items-center justify-center mb-3">
                                        <item.icon size={26} />
                                    </div>
                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1">{item.title}</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 leading-snug">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section id="how" className="py-14 bg-gradient-to-br from-green-900 to-[#0b3d1e] text-white">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl sm:text-4xl font-extrabold">How It Works?</h2>
                            <p className="text-green-100/80 mt-2 text-sm sm:text-base">
                                Get your groceries in just a few simple steps
                            </p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {steps.map((s, i) => (
                                <div key={s.title} className="relative text-center">
                                    <div className="relative mx-auto h-20 w-20 rounded-full bg-white text-green-800 flex items-center justify-center shadow-lg">
                                        <s.icon size={34} />
                                        <span className="absolute -top-1 -left-1 h-7 w-7 rounded-full bg-[#b9e36b] text-green-950 text-sm font-bold flex items-center justify-center">
                                            {i + 1}
                                        </span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <span className="hidden lg:block absolute top-10 left-[62%] w-[76%] border-t-2 border-dashed border-green-300/60" />
                                    )}
                                    <h3 className="font-bold text-lg mt-4">{s.title}</h3>
                                    <p className="text-green-100/80 text-sm mt-1 max-w-[200px] mx-auto">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Everything in one app */}
                <section id="features" className="py-16 bg-white overflow-hidden">
                    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                        <div className="lg:col-span-4">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-green-900 leading-tight">
                                Everything You Need <br /> In One App
                            </h2>
                            <p className="text-slate-600 mt-4 text-base">
                                From fresh fruits & vegetables to daily essentials, personal care, snacks and more – all available in one place.
                            </p>
                            <ul className="mt-6 space-y-3">
                                {appFeatures.map((f) => (
                                    <li key={f} className="flex items-center gap-3 text-slate-700 font-medium">
                                        <CheckCircle2 size={20} className="text-green-700 shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={PLAY_STORE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-8 inline-flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors shadow-md"
                            >
                                Download DM Groceries App <ArrowRight size={18} />
                            </a>
                        </div>

                        {/* Phone mockups */}
                        <div className="lg:col-span-8 relative flex items-center justify-center gap-3 sm:gap-6 lg:gap-7 p-4 sm:p-10 lg:p-12 bg-gradient-to-br from-[#f1f9e8] to-white rounded-[2.8rem] shadow-inner w-full">
                            {phoneScreens.map((s) => (
                                <div
                                    key={s.src}
                                    style={{ flex: '1 1 0%', maxWidth: 300 }}
                                    className={`min-w-0 rounded-[1.4rem] sm:rounded-[2.4rem] border-[5px] sm:border-[9px] border-slate-900 bg-white shadow-2xl overflow-hidden transition-transform hover:-translate-y-1.5 `}
                                >
                                    <img src={s.src} alt={s.alt} className="w-full aspect-[860/1829] object-cover object-center block" loading="lazy" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Shop by category */}
                <section id="categories" className="py-12 bg-[#f4faee]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-extrabold text-green-900">Shop by Category</h2>
                            <p className="text-slate-600 text-sm mt-1">Explore our wide range of fresh and daily essentials</p>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => scrollCats(-1)}
                                aria-label="Previous categories"
                                className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md border border-green-100 hover:bg-green-50"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div
                                ref={catRef}
                                className="flex gap-4 overflow-x-auto pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            >
                                {categories.map((c) => (
                                    <Link
                                        key={c.name}
                                        to="/user"
                                        className="snap-start shrink-0 w-36 sm:w-40 bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all p-4 text-center"
                                    >
                                        <div className="h-20 flex items-center justify-center text-5xl">{c.emoji}</div>
                                        <p className="text-sm font-semibold text-slate-800 mt-2 leading-tight">{c.name}</p>
                                    </Link>
                                ))}
                            </div>
                            <button
                                onClick={() => scrollCats(1)}
                                aria-label="Next categories"
                                className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md border border-green-100 hover:bg-green-50"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Second banner */}
                <section className="py-8 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <img
                        src={MID_BANNER}
                        alt="Fresh and healthy food for a better life"
                        className="w-full h-auto block rounded-2xl sm:rounded-3xl shadow-lg"
                        loading="lazy"
                    />
                    </div>
                </section>

                {/* Download strip */}
                <section
                    className="relative text-white py-12 bg-green-900 bg-cover bg-center"
                    style={{ backgroundImage: `url("${FOOTER_BG}")` }}
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 items-center">
                        <div>
                            <h2 className="text-3xl font-extrabold">Download {appName} App</h2>
                            <p className="text-green-100/90 mt-2 text-sm sm:text-base">
                                Get the best shopping experience on our mobile app.
                            </p>
                            <StoreButtons className="mt-5" />
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-center">
                            {[
                                { icon: ShoppingCart, label: 'Easy Ordering' },
                                { icon: BadgePercent, label: 'Exclusive Offers' },
                                { icon: MapPin, label: 'Track Your Order' },
                                { icon: Headphones, label: '24/7 Support' }
                            ].map((f) => (
                                <div key={f.label}>
                                    <div className="mx-auto h-14 w-14 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                                        <f.icon size={24} />
                                    </div>
                                    <p className="text-xs sm:text-sm mt-2 font-medium">{f.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="py-14 bg-white">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-extrabold text-green-900 text-center mb-8">What Our Customers Say</h2>
                        {reviews.length > 0 ? (
                            <div className="grid md:grid-cols-3 gap-5">
                                {reviews.map((r) => (
                                    <div key={r._id} className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 flex gap-4">
                                        <div className="h-14 w-14 shrink-0 rounded-full bg-green-100 text-green-800 font-bold text-xl flex items-center justify-center">
                                            {r.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex text-amber-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} className={i < r.rating ? 'fill-amber-400' : 'text-slate-300'} />
                                                ))}
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1 break-words">{r.message}</p>
                                            <p className="text-sm font-bold text-slate-900 mt-2">{r.name}</p>
                                            {r.city && <p className="text-xs text-slate-500">{r.city}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500">No reviews yet. Be the first to share your experience!</p>
                        )}

                        <div className="mt-8 max-w-xl mx-auto text-center">
                            {feedback && (
                                <p className={`mb-4 text-sm font-medium rounded-lg px-4 py-3 ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                                    {feedback.text}
                                </p>
                            )}
                            {!showForm ? (
                                <button
                                    onClick={() => { setShowForm(true); setFeedback(null); }}
                                    className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                                >
                                    <Star size={16} /> Write a Testimonial
                                </button>
                            ) : (
                                <form onSubmit={submitTestimonial} className="text-left bg-[#f4faee] border border-green-100 rounded-2xl p-5 space-y-3">
                                    <h3 className="font-bold text-green-900 text-lg">Share your experience</h3>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <input
                                            required
                                            maxLength={80}
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="Your name *"
                                            className="w-full rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30"
                                        />
                                        <input
                                            maxLength={80}
                                            value={form.city}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                            placeholder="City"
                                            className="w-full rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">Rating:</span>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <button
                                                type="button"
                                                key={n}
                                                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                                                onClick={() => setForm({ ...form, rating: n })}
                                            >
                                                <Star size={24} className={n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        required
                                        minLength={10}
                                        maxLength={500}
                                        rows={4}
                                        value={form.message}
                                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                                        placeholder="Write your testimonial (min 10 characters) *"
                                        className="w-full rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30"
                                    />
                                    <p className="text-xs text-slate-500">Your testimonial will be shown after admin approval.</p>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="bg-green-800 hover:bg-green-900 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                                        >
                                            {submitting ? 'Submitting...' : 'Submit'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowForm(false)}
                                            className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-white font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer
                id="contact"
                className="text-white bg-green-950 bg-cover bg-center"
                style={{ backgroundImage: `url("${FOOTER_BG}")` }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="col-span-2 md:col-span-1">
                            <img src={LOGO} alt={appName} className="h-16 w-auto bg-white/90 rounded-xl p-1.5" />
                            <p className="text-sm text-green-100/80 mt-4 max-w-xs">
                                Your daily essentials, delivered fast & fresh at your doorstep. Fresh products, great prices and a healthier life for you.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-3">Quick Links</h4>
                            <ul className="space-y-2 text-sm text-green-100/80">
                                {navLinks.map((l) => (
                                    <li key={l.label}><NavAnchor href={l.href} className="hover:text-white">{l.label}</NavAnchor></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-3">Partner With Us</h4>
                            <ul className="space-y-2 text-sm text-green-100/80">
                                <li><Link to="/join" className="hover:text-white">Become a Seller</Link></li>
                                <li><Link to="/join" className="hover:text-white">Delivery Partner</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-3"><Link to="/contact" className="hover:text-white">Contact Us</Link></h4>
                            <ul className="space-y-3 text-sm text-green-100/80">
                                <li className="flex items-center gap-2"><MapPin size={16} className="shrink-0" /> {settings?.address || 'Indore, Madhya Pradesh'}</li>
                                <li>
                                    <a href={`tel:${String(contactPhone).replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white">
                                        <Phone size={16} className="shrink-0" /> {contactPhone}
                                    </a>
                                </li>
                                <li>
                                    <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 hover:text-white break-all">
                                        <Mail size={16} className="shrink-0" /> {contactEmail}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/15 mt-10 pt-5 text-center text-xs text-green-100/70">
                        © {new Date().getFullYear()} {appName}. All Rights Reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
