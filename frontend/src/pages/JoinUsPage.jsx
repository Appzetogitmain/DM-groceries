import React from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronLeft,
    ArrowRight,
    Headphones,
    TrendingUp,
    Users,
    Store,
    IndianRupee,
    Clock,
    MapPin,
    ShieldCheck
} from 'lucide-react';
import { useSettings } from '@core/context/SettingsContext';

const img = (name) => `/${encodeURIComponent(name)}`;

const sellerPoints = [
    { icon: TrendingUp, text: 'Increase your sales' },
    { icon: Users, text: 'Reach nearby customers' },
    { icon: Store, text: 'Easy product management' },
    { icon: IndianRupee, text: 'Flexible subscription plans' }
];

const deliveryPoints = [
    { icon: IndianRupee, text: 'Earn attractive income' },
    { icon: Clock, text: 'Flexible working hours' },
    { icon: MapPin, text: 'Deliver in your nearby area' },
    { icon: ShieldCheck, text: 'Safe and secure process' }
];

const PointList = ({ points, iconClass }) => (
    <ul className="space-y-3">
        {points.map((p) => (
            <li key={p.text} className="flex items-center gap-4">
                <span className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${iconClass}`}>
                    <p.icon size={22} />
                </span>
                <span className="text-slate-700 text-base">{p.text}</span>
            </li>
        ))}
    </ul>
);

const JoinUsPage = () => {
    const { settings } = useSettings();
    const appName = settings?.appName || 'DM Groceries';

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

                {/* Heading */}
                <header className="text-center -mt-4">
                    <img src={img('Logo.png')} alt={appName} className="mx-auto h-28 sm:h-36 w-auto object-contain" />
                    <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900">
                        Grow Your Business <br />
                        <span className="text-green-800">with {appName}</span>
                    </h1>
                    <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-xl mx-auto">
                        Whether you want to sell your products or deliver orders and earn, we have the right opportunity for you.
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-800" />
                        <span className="h-1.5 w-10 rounded-full bg-green-800" />
                        <span className="h-1.5 w-1.5 rounded-full bg-green-800" />
                    </div>
                </header>

                {/* Cards */}
                <div className="mt-10 grid md:grid-cols-2 gap-6 lg:gap-8">
                    {/* Seller */}
                    <section className="rounded-[2rem] bg-white/80 backdrop-blur border border-green-100 shadow-xl overflow-hidden flex flex-col">
                        <img src={img('seller.png')} alt="DM Groceries store" className="w-full h-auto block" />
                        <div className="p-6 sm:p-8 flex flex-col flex-1">
                            <div className="text-center">
                                <p className="tracking-widest text-slate-600 text-sm sm:text-base">BECOME A</p>
                                <h2 className="text-4xl sm:text-5xl font-extrabold text-green-800 tracking-tight">SELLER</h2>
                                <p className="mt-2 text-slate-600">
                                    List your store and reach thousands of customers in your area.
                                </p>
                            </div>
                            <div className="mt-6 flex-1">
                                <PointList points={sellerPoints} iconClass="bg-green-100 text-green-800" />
                            </div>
                            <Link
                                to="/seller/auth"
                                className="mt-8 flex items-center justify-between bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white font-semibold text-lg rounded-full px-8 py-4 shadow-lg transition-colors"
                            >
                                <span className="flex-1 text-center">Become a Seller</span>
                                <ArrowRight size={22} />
                            </Link>
                        </div>
                    </section>

                    {/* Delivery */}
                    <section className="rounded-[2rem] bg-[#fffaf0]/85 backdrop-blur border border-amber-100 shadow-xl overflow-hidden flex flex-col">
                        <img src={img('delivery.png')} alt="DM Groceries delivery partner" className="w-full h-auto block" />
                        <div className="p-6 sm:p-8 flex flex-col flex-1">
                            <div className="text-center">
                                <p className="tracking-widest text-slate-600 text-sm sm:text-base">BECOME A</p>
                                <h2 className="text-4xl sm:text-5xl font-extrabold text-orange-700 tracking-tight">DELIVERY PARTNER</h2>
                                <p className="mt-2 text-slate-600">
                                    Deliver happiness and earn on your own schedule.
                                </p>
                            </div>
                            <div className="mt-6 flex-1">
                                <PointList points={deliveryPoints} iconClass="bg-amber-100 text-orange-600" />
                            </div>
                            <Link
                                to="/delivery/auth"
                                className="mt-8 flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg rounded-full px-8 py-4 shadow-lg transition-colors"
                            >
                                <span className="flex-1 text-center">Become a Delivery Partner</span>
                                <ArrowRight size={22} />
                            </Link>
                        </div>
                    </section>
                </div>

            </div>
        </div>
    );
};

export default JoinUsPage;
