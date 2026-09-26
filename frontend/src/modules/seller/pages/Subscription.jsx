import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, StatusBadge, Modal } from '@shared/components/ui';
import { CheckCircle2, Crown, Zap, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { sellerApi } from '../services/sellerApi';
import { toast } from 'sonner';
import { useAuth } from '@core/context/AuthContext';

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
    const { user } = useAuth();
    const [currentSub, setCurrentSub] = useState(null);
    const [plans, setPlans] = useState([]);
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingPlans, setViewingPlans] = useState(false);
    
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
                setViewingPlans(false);
            } else {
                setCurrentSub(null);
                setViewingPlans(true);
                await fetchPlans();
            }
        } catch (error) {
            toast.error(error.message || "Failed to load subscription details");
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await sellerApi.getAvailablePlans();
            setPlans(res.data?.results || []);
        } catch (error) {
            toast.error("Failed to load plans");
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

    const handleUpgradeClick = async () => {
        await fetchPlans();
        setViewingPlans(true);
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
                toast.error("Razorpay SDK failed to load. Please check your connection.");
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
                toast.success("Subscription activated successfully!");
                setCheckoutModalOpen(false);
                init(); // Reload state
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
                        toast.success("Payment successful! Subscription activated.");
                        setCheckoutModalOpen(false);
                        init();
                    } catch (err) {
                        toast.error(err.message || "Payment verification failed");
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
                toast.error("Payment failed: " + response.error.description);
                setProcessing(false);
            });
            
            // Close our modal first so it doesn't trap focus or overlay Razorpay
            setCheckoutModalOpen(false);
            rzp.open();

        } catch (error) {
            toast.error(error.message || "Failed to initiate checkout");
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
                title="Subscription & Billing"
                description="Manage your seller plan and feature access"
            />

            {!viewingPlans && currentSub && (
                <div className="space-y-6">
                    <Card className="overflow-hidden border-2 border-primary-100">
                        <div className="bg-primary-50 p-6 border-b border-primary-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-900">{currentSub.planSnapshot?.name || currentSub.plan?.name}</h2>
                                    <StatusBadge status={currentSub.status} />
                                </div>
                                <p className="text-gray-600 mt-1">Billing Cycle: <span className="font-medium text-gray-900">{currentSub.billingCycle}</span></p>
                            </div>
                            <Button onClick={handleUpgradeClick} className="flex items-center gap-2">
                                <Crown className="w-4 h-4" /> Change / Upgrade Plan
                            </Button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Valid From</p>
                                <p className="text-lg font-semibold text-gray-900">{new Date(currentSub.startDate).toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Valid Until</p>
                                <p className="text-lg font-semibold text-gray-900">{new Date(currentSub.endDate).toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Order Limit Usage</p>
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                                    {currentSub.orderLimit === null ? (
                                        <span className="text-lg font-semibold text-gray-900">Unlimited</span>
                                    ) : (
                                        <div className="w-full">
                                            <p className="text-lg font-semibold text-gray-900">
                                                {currentSub.ordersUsed} / {currentSub.orderLimit}
                                            </p>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div 
                                                    className={`h-1.5 rounded-full ${currentSub.ordersUsed >= currentSub.orderLimit ? 'bg-red-500' : 'bg-primary-500'}`} 
                                                    style={{ width: `${Math.min((currentSub.ordersUsed / currentSub.orderLimit) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Included Features</h3>
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

            {viewingPlans && (
                <div className="space-y-6">
                    {currentSub && (
                        <Button variant="ghost" onClick={() => setViewingPlans(false)} className="mb-4">
                            &larr; Back to Current Subscription
                        </Button>
                    )}
                    
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose the right plan for your business</h2>
                        <p className="text-gray-600">Select a subscription plan to unlock features and scale your sales.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div key={plan._id} className="relative flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                                {plan.orderLimit === null && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> BEST VALUE
                                    </div>
                                )}
                                <div className="p-6 md:p-8 border-b border-gray-100 flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-2 mb-6">
                                        <span className="text-4xl font-extrabold text-gray-900">₹{plan.monthlyPrice}</span>
                                        <span className="text-gray-500 font-medium">/mo</span>
                                    </div>
                                    <Button 
                                        className="w-full justify-center" 
                                        onClick={() => handleSelectPlan(plan)}
                                        variant={currentSub?.plan?._id === plan._id ? "outline" : "primary"}
                                    >
                                        {currentSub?.plan?._id === plan._id ? "Renew Plan" : "Select Plan"}
                                    </Button>

                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <ShoppingBag className="w-5 h-5 text-gray-400" />
                                            <span className="text-gray-700 font-medium">
                                                {plan.orderLimit === null ? 'Unlimited Orders' : `Up to ${plan.orderLimit} orders/cycle`}
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
                title="Complete Subscription Setup"
                size="md"
            >
                {selectedPlan && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-900">{selectedPlan.name}</h4>
                            <p className="text-sm text-gray-500">{selectedPlan.features?.length} Features Included</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700 block">Select Billing Cycle</label>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedPlan.billingTypes.map(type => (
                                    <div 
                                        key={type}
                                        onClick={() => !processing && setSelectedCycle(type)}
                                        className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-colors ${selectedCycle === type ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200 bg-white'}`}
                                    >
                                        <p className={`font-bold ${selectedCycle === type ? 'text-primary-700' : 'text-gray-700'}`}>{type === 'MONTHLY' ? 'Monthly' : 'Yearly'}</p>
                                        <p className="text-sm text-gray-500">₹{type === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {offers.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                <label className="text-sm font-semibold text-gray-700 block flex items-center justify-between">
                                    <span>Available Offers</span>
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
                                                    Save {offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
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
                                <span>Base Price</span>
                                <span>₹{selectedCycle === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice}</span>
                            </div>
                            
                            {selectedOffer && (() => {
                                const offer = offers.find(o => o._id === selectedOffer);
                                const basePrice = selectedCycle === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
                                let discount = 0;
                                if (offer.discountType === 'PERCENTAGE') {
                                    discount = Math.round((basePrice * offer.discountValue) / 100);
                                } else {
                                    discount = Math.min(offer.discountValue, basePrice);
                                }
                                return (
                                    <div className="flex justify-between text-green-400 text-sm">
                                        <span>Discount ({offer.name})</span>
                                        <span>-₹{discount}</span>
                                    </div>
                                );
                            })()}

                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-700">
                                <span>Total to Pay</span>
                                <span>
                                    ₹{(() => {
                                        const basePrice = selectedCycle === 'MONTHLY' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
                                        if (!selectedOffer) return basePrice;
                                        const offer = offers.find(o => o._id === selectedOffer);
                                        let discount = 0;
                                        if (offer.discountType === 'PERCENTAGE') {
                                            discount = Math.round((basePrice * offer.discountValue) / 100);
                                        } else {
                                            discount = Math.min(offer.discountValue, basePrice);
                                        }
                                        return Math.max(0, basePrice - discount);
                                    })()}
                                </span>
                            </div>
                        </div>

                        <Button 
                            className="w-full justify-center py-3 text-lg" 
                            onClick={handleCheckout} 
                            loading={processing}
                        >
                            Proceed to Payment
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Subscription;
