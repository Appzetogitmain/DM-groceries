import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, StatusBadge, Modal } from '@shared/components/ui';
import { CheckCircle2, Crown, Zap, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { sellerApi } from '../services/sellerApi';
import { toast } from 'sonner';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import { cn } from '@/lib/utils';
import { useTranslation } from "react-i18next";
import { sellerLocale } from "../i18n/format";

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Subscription = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { settings } = useSettings();
    const isSubscriptionOnlineEnabled = settings?.sellerSubscriptionOnlineEnabled !== false;
    const [currentSub, setCurrentSub] = useState(null);
    const [plans, setPlans] = useState([]);
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Checkout state
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedCycle, setSelectedCycle] = useState('MONTHLY');
    const [selectedOffer, setSelectedOffer] = useState('');
    const [processing, setProcessing] = useState(false);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        try {
            setLoading(true);
            const subRes = await sellerApi.getCurrentSubscription();
            if (subRes.data?.result) {
                setCurrentSub(subRes.data.result);
            } else {
                setCurrentSub(null);
            }
            // Always fetch all plans so the seller can see/upgrade
            await fetchPlans();
        } catch (error) {
            toast.error(t("sSub.loadFailed"));
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await sellerApi.getAvailablePlans();
            setPlans(res.data?.results || res.data?.result || []);
        } catch (error) {
            toast.error(t("sSub.plansFailed"));
        }
    };

    const fetchOffers = async (planId) => {
        try {
            const res = await sellerApi.getActiveOffers(planId);
            setOffers(res.data?.results || []);
            setSelectedOffer(''); // reset offer on plan change
        } catch (error) {
            console.error("Failed to load offers", error);
        }
    };

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setSelectedCycle(plan.billingTypes[0]); // default to first available
        fetchOffers(plan._id);
        setCheckoutModalOpen(true);
    };

    const handleCheckout = async () => {
        try {
            setProcessing(true);
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error(t("sSub.sdkFailed"));
                setProcessing(false);
                return;
            }

            // Create Order
            const orderRes = await sellerApi.createSubscriptionOrder({
                planId: selectedPlan._id,
                billingCycle: selectedCycle,
                offerId: selectedOffer || undefined,
            });

            const orderData = orderRes.data?.result;

            // If it's a free plan or 100% discount, it activates immediately
            if (!orderData.paymentRequired) {
                toast.success(t("sSub.activated"));
                setCheckoutModalOpen(false);
                init(); // Reload state
                return;
            }

            if (!isSubscriptionOnlineEnabled) {
                toast.error(t("sSub.onlineOff"));
                setProcessing(false);
                return;
            }

            // Otherwise, open Razorpay
            const options = {
                key: orderData.razorpayKeyId,
                amount: orderData.amountPaise,
                currency: orderData.currency,
                name: "DM Groceries",
                description: `Subscription: ${selectedPlan.name} (${selectedCycle})`,
                order_id: orderData.razorpayOrderId,
                handler: async function (response) {
                    try {
                        setProcessing(true);
                        await sellerApi.verifySubscriptionPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        toast.success(t("sSub.paymentSuccess"));
                        setCheckoutModalOpen(false);
                        init();
                    } catch (err) {
                        toast.error(t("sSub.verifyFailed"));
                    } finally {
                        setProcessing(false);
                    }
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                    contact: user?.phone,
                },
                theme: {
                    color: "#16a34a", // Primary brand green
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(t("sSub.paymentFailed", { reason: response.error.description }));
                setProcessing(false);
            });
            
            // Close our modal first so it doesn't trap focus or overlay Razorpay
            setCheckoutModalOpen(false);
            rzp.open();

        } catch (error) {
            toast.error(t("sSub.checkoutFailed"));
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <PageHeader
                title={t("sSub.title")}
                description={t("sSub.subtitle")}
            />

            {currentSub && (
                <div className="space-y-6">
                    {/* 50% Order Limit Warning Banner */}
                    {currentSub.isHalfUsed && !currentSub.isNearLimit && !currentSub.isLimitReached && (
                        <div className="p-4 rounded-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-start sm:items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                    <AlertCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-900 text-base">📊 {t("sDash.limit50")}</h3>
                                    <p className="text-blue-800 text-sm mt-0.5">
                                        {t("sDash.youHaveUsed")} <span className="font-bold">{currentSub.usagePercentage}%</span> {t("sDash.ofYourLimit", { cycle: t(`sDash.cycle.${String(currentSub.billingCycle || "").toLowerCase()}`, { defaultValue: currentSub.billingCycle?.toLowerCase() || "" }) })}.
                                        <span className="font-bold"> {currentSub.remainingOrders}</span> {t("sSub.limitRemaining")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 90% Order Limit Warning Banner */}
                    {currentSub.isNearLimit && !currentSub.isLimitReached && (
                        <div className="p-4 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-start sm:items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                                    <AlertCircle className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-900 text-base">⚠️ {t("sDash.limitAlmost")}</h3>
                                    <p className="text-amber-800 text-sm mt-0.5">
                                        {t("sDash.youHaveUsed")} <span className="font-bold">{currentSub.usagePercentage}%</span> {t("sDash.ofYourLimit", { cycle: t(`sDash.cycle.${String(currentSub.billingCycle || "").toLowerCase()}`, { defaultValue: currentSub.billingCycle?.toLowerCase() || "" }) })}.
                                        {t("sDash.only")} <span className="font-bold">{currentSub.remainingOrders}</span> {t("sSub.limitRemaining")}
                                        {t("sSub.considerUpgrading")}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="flex items-center gap-2 whitespace-nowrap bg-amber-600 hover:bg-amber-700">
                                <Crown className="w-4 h-4" /> {t("sDash.upgradePlan")}
                            </Button>
                        </div>
                    )}

                    {/* Order Limit Reached Banner */}
                    {currentSub.isLimitReached && (
                        <div className="p-4 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-start sm:items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg shrink-0">
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-red-900 text-base">🚫 {t("alerts.limitReached")}</h3>
                                    <p className="text-red-800 text-sm mt-0.5">
                                        {t("sDash.usedAll")} <span className="font-bold">{currentSub.orderLimit}</span> {t("sDash.ordersInPlan")}
                                        {t("sSub.blocked")}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="flex items-center gap-2 whitespace-nowrap bg-red-600 hover:bg-red-700">
                                <Crown className="w-4 h-4" /> {t("sDash.upgradeNow")}
                            </Button>
                        </div>
                    )}

                    <Card className="overflow-hidden border-2 border-primary-100">
                        <div className="bg-primary-50 p-6 border-b border-primary-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-900">{currentSub.planSnapshot?.name || currentSub.plan?.name}</h2>
                                    <StatusBadge status={currentSub.status} />
                                </div>
                                <p className="text-gray-600 mt-1">{t("sSub.billingCycle")}: <span className="font-medium text-gray-900">{t(`sSub.cycles.${String(currentSub.billingCycle || "").toUpperCase()}`, { defaultValue: currentSub.billingCycle })}</span></p>
                            </div>
                            <Button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="flex items-center gap-2">
                                <Crown className="w-4 h-4" /> {t("sSub.changeUpgrade")}
                            </Button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t("sSub.validFrom")}</p>
                                <p className="text-lg font-semibold text-gray-900">{new Date(currentSub.startDate).toLocaleDateString(sellerLocale())}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t("sSub.validUntil")}</p>
                                <p className="text-lg font-semibold text-gray-900">{new Date(currentSub.endDate).toLocaleDateString(sellerLocale())}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t("sSub.limitUsage")}</p>
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                                    {currentSub.orderLimit === null || currentSub.orderLimit === undefined ? (
                                        <span className="text-lg font-semibold text-gray-900">{t("sSub.unlimited")}</span>
                                    ) : (
                                        <div className="w-full">
                                            <p className="text-lg font-semibold text-gray-900">
                                                {currentSub.ordersUsed} / {currentSub.orderLimit}
                                            </p>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div 
                                                    className={cn(
                                                        "h-1.5 rounded-full transition-all",
                                                        (currentSub.usagePercentage || 0) >= 100 ? 'bg-red-500' :
                                                        (currentSub.usagePercentage || 0) >= 90 ? 'bg-amber-500' :
                                                        'bg-primary-500'
                                                    )}
                                                    style={{ width: `${Math.min((currentSub.ordersUsed / currentSub.orderLimit) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Order Usage Stats */}
                        {currentSub.orderLimit !== null && currentSub.orderLimit !== undefined && (
                            <div className="px-6 pb-6">
                                <div className="border-t border-gray-100 pt-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                                            <p className="text-xl font-extrabold text-blue-700">{currentSub.ordersUsed || 0}</p>
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-1">{t("sDash.usedOrders")}</p>
                                        </div>
                                        <div className="text-center p-3 bg-slate-50 rounded-xl">
                                            <p className="text-xl font-extrabold text-slate-700">{currentSub.orderLimit}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{t("sDash.totalLimit")}</p>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 rounded-xl">
                                            <p className="text-xl font-extrabold text-green-700">{currentSub.remainingOrders ?? Math.max(0, currentSub.orderLimit - (currentSub.ordersUsed || 0))}</p>
                                            <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mt-1">{t("sDash.remaining")}</p>
                                        </div>
                                        <div className="text-center p-3 bg-amber-50 rounded-xl">
                                            <p className={cn(
                                                "text-xl font-extrabold",
                                                (currentSub.usagePercentage || 0) >= 90 ? "text-red-600" : "text-amber-700"
                                            )}>
                                                {currentSub.usagePercentage ?? Math.round(((currentSub.ordersUsed || 0) / currentSub.orderLimit) * 100)}%
                                            </p>
                                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-1">{t("sDash.usage")}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t("sSub.included")}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {currentSub.plan?.features?.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-4 bg-white rounded-xl border shadow-sm">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-gray-900">{feature.name}</p>
                                        <p className="text-sm text-gray-500 mt-1">{feature.code}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {plans.length > 0 && (
                <div className="space-y-6">
                    {!isSubscriptionOnlineEnabled && (
                        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center gap-3 text-amber-900 mb-6">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                            <div className="text-xs font-medium leading-relaxed">
                                <span className="font-bold">{t("sSub.onlineNotice")}</span> {t("sSub.onlineNoticeBody")}
                            </div>
                        </div>
                    )}

                    {currentSub && (
                        <div className="border-t border-gray-200 pt-6 mt-6"></div>
                    )}
                    
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            {currentSub ? t('sSub.upgradeOrChange') : t('sSub.chooseRight')}
                        </h2>
                        <p className="text-gray-600">{t("sSub.selectPlanBody")}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div key={plan._id} className={`relative flex flex-col bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg transition-shadow overflow-hidden ${currentSub?.plan?._id === plan._id ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'}`}>
                                {currentSub?.plan?._id === plan._id && (
                                    <div className="absolute top-0 left-0 right-0 bg-primary-500 text-white text-xs font-bold text-center py-1">
                                        {t("sSub.currentPlanCaps")}
                                    </div>
                                )}
                                {plan.orderLimit === null && !(currentSub?.plan?._id === plan._id) && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> {t("sSub.bestValue")}
                                    </div>
                                )}
                                <div className={`p-6 md:p-8 border-b border-gray-100 flex-1 ${currentSub?.plan?._id === plan._id ? 'pt-10' : ''}`}>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-2 mb-6">
                                        <span className="text-4xl font-extrabold text-gray-900">₹{plan.monthlyPrice}</span>
                                        <span className="text-gray-500 font-medium">{t("sSub.perMonth")}</span>
                                    </div>
                                    <Button 
                                        className="w-full justify-center" 
                                        onClick={() => handleSelectPlan(plan)}
                                        variant={currentSub?.plan?._id === plan._id ? "outline" : "primary"}
                                    >
                                        {currentSub?.plan?._id === plan._id ? t("sProfile.renewPlan") : t("sSub.selectPlan")}
                                    </Button>

                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <ShoppingBag className="w-5 h-5 text-gray-400" />
                                            <span className="text-gray-700 font-medium">
                                                {plan.orderLimit === null ? t('sSub.unlimitedOrders') : t('sSub.upToOrders', { count: plan.orderLimit })}
                                            </span>
                                        </div>
                                        {plan.features?.map(f => (
                                            <div key={f._id} className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                <span className="text-gray-600 text-sm">{f.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Modal
                isOpen={checkoutModalOpen}
                onClose={() => !processing && setCheckoutModalOpen(false)}
                title={t("sSub.completeSetup")}
                size="md"
            >
                {selectedPlan && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-900">{selectedPlan.name}</h4>
                            <p className="text-sm text-gray-500">{selectedPlan.features?.length} Features Included</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700 block">{t("sSub.selectCycle")}</label>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedPlan.billingTypes.map(type => (
                                    <div 
                                        key={type}
                                        onClick={() => !processing && setSelectedCycle(type)}
                                        className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-colors ${selectedCycle === type ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200 bg-white'}`}
                                    >
                                        <p className={`font-bold ${selectedCycle === type ? 'text-primary-700' : 'text-gray-700'}`}>{type === 'MONTHLY' ? t('sSub.cycles.MONTHLY') : t('sSub.cycles.YEARLY')}</p>
                                        <p className="text-sm text-gray-500">₹{type === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {offers.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                <label className="text-sm font-semibold text-gray-700 block flex items-center justify-between">
                                    <span>{t("sSub.offers")}</span>
                                    {selectedOffer && (
                                        <button onClick={() => setSelectedOffer('')} className="text-xs text-red-500 hover:underline">Remove</button>
                                    )}
                                </label>
                                <div className="space-y-2">
                                    {offers.map(offer => (
                                        <div 
                                            key={offer._id}
                                            onClick={() => !processing && setSelectedOffer(offer._id)}
                                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${selectedOffer === offer._id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-gray-900">{offer.name}</p>
                                                <p className="text-xs text-green-600 font-medium">
                                                    {t('sSub.save', { amount: offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}%` : `₹${selectedCycle === 'YEARLY' ? offer.discountValue * 12 : offer.discountValue}` })}
                                                </p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedOffer === offer._id ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                                {selectedOffer === offer._id && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-900 text-white p-4 rounded-xl space-y-3">
                            <div className="flex justify-between text-gray-300 text-sm">
                                <span>{t("sSub.basePrice")}</span>
                                <span>₹{selectedCycle === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice}</span>
                            </div>
                            
                            {selectedOffer && (() => {
                                const offer = offers.find(o => o._id === selectedOffer);
                                const basePrice = selectedCycle === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
                                let discount = 0;
                                if (offer.discountType === 'PERCENTAGE') {
                                    discount = Math.round((basePrice * offer.discountValue) / 100);
                                } else {
                                    let calculatedDiscount = offer.discountValue;
                                    if (selectedCycle === 'YEARLY') {
                                        calculatedDiscount = offer.discountValue * 12;
                                    }
                                    discount = Math.min(calculatedDiscount, basePrice);
                                }
                                return (
                                    <div className="flex justify-between text-green-400 text-sm">
                                        <span>Discount ({offer.name})</span>
                                        <span>-₹{discount}</span>
                                    </div>
                                );
                            })()}

                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-700">
                                <span>{t("sSub.totalToPay")}</span>
                                <span>
                                    ₹{(() => {
                                        const basePrice = selectedCycle === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
                                        if (!selectedOffer) return basePrice;
                                        const offer = offers.find(o => o._id === selectedOffer);
                                        let discount = 0;
                                        if (offer.discountType === 'PERCENTAGE') {
                                            discount = Math.round((basePrice * offer.discountValue) / 100);
                                        } else {
                                            let calculatedDiscount = offer.discountValue;
                                            if (selectedCycle === 'YEARLY') {
                                                calculatedDiscount = offer.discountValue * 12;
                                            }
                                            discount = Math.min(calculatedDiscount, basePrice);
                                        }
                                        return Math.max(0, basePrice - discount);
                                    })()}
                                </span>
                            </div>
                        </div>

                        {(() => {
                            const basePrice = selectedCycle === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
                            let discount = 0;
                            if (selectedOffer) {
                                const offer = offers.find(o => o._id === selectedOffer);
                                if (offer) {
                                    if (offer.discountType === 'PERCENTAGE') {
                                        discount = Math.round((basePrice * offer.discountValue) / 100);
                                    } else {
                                        let calculatedDiscount = offer.discountValue;
                                        if (selectedCycle === 'YEARLY') {
                                            calculatedDiscount = offer.discountValue * 12;
                                        }
                                        discount = Math.min(calculatedDiscount, basePrice);
                                    }
                                }
                            }
                            const finalPrice = Math.max(0, basePrice - discount);
                            const isPaid = finalPrice > 0;
                            const isBlocked = isPaid && !isSubscriptionOnlineEnabled;

                            return (
                                <div className="space-y-2">
                                    <Button 
                                        className={cn("w-full justify-center py-3 text-lg", isBlocked && "opacity-60 cursor-not-allowed bg-slate-400 hover:bg-slate-400")} 
                                        onClick={handleCheckout} 
                                        loading={processing}
                                        disabled={isBlocked || processing}
                                    >
                                        {isBlocked ? t("sSub.onlineDisabled") : (isPaid ? t("sSub.proceed") : t("sSub.activateFree"))}
                                    </Button>
                                    {isBlocked && (
                                        <p className="text-xs text-rose-600 font-medium text-center">
                                            {t("sSub.onlineOffContact")}
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Subscription;
