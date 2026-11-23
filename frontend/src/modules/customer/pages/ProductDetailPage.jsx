import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, Plus, Minus, Star, ShieldCheck, Clock, ArrowLeft, MessageSquare } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { customerApi } from '../services/customerApi';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import { useSettings } from '@core/context/SettingsContext';
import Lottie from 'lottie-react';
import { pickDefaultVariant, getVariantKey, getVariantStock, getVariantPricing } from '../utils/variantUtils';
import { useTranslation } from 'react-i18next';
import { getLocalizedItemLabel as itemName } from "../i18n/format";
import { translateEta, getLocalizedName } from '../i18n/format';

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { cart, addToCart, updateQuantity } = useCart();
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } = useWishlist();
    const { showToast } = useToast();
    const { t } = useTranslation();
    const { currentLocation } = useAppLocation();
    const { settings } = useSettings();

    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImage, setActiveImage] = useState('');
    const [reviews, setReviews] = useState([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [localHasReviewed, setLocalHasReviewed] = useState(false);
    const [noServiceData, setNoServiceData] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);

    // Dynamically load no-service Lottie on mount
    useEffect(() => {
        import('@/assets/lottie/animation.json')
            .then((m) => setNoServiceData(m.default))
            .catch(() => {});
    }, []);

    const fetchData = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        setError(null);
        try {
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);

            const params = hasValidLocation ? {
                lat: currentLocation.latitude,
                lng: currentLocation.longitude
            } : {};

            const res = await customerApi.getProductById(id, params);
            if (res.data.success) {
                const p = res.data.result;
                const formatted = {
                    ...p,
                    id: p._id,
                    images: [p.mainImage, ...(p.galleryImages || [])].filter(Boolean)
                };
                setProduct(formatted);
                // Keep the user's chosen variant on refresh if it still exists,
                // otherwise default to the first variant that is not out of stock.
                setSelectedVariant((prev) => {
                    const prevKey = getVariantKey(prev);
                    const still = prevKey && (formatted.variants || []).find((v) => getVariantKey(v) === prevKey);
                    return still || pickDefaultVariant(formatted);
                });
                setActiveImage(formatted.images[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop');
                fetchReviews();
            }
        } catch (err) {
            console.error("Fetch product error:", err);
            setError(err.response?.data?.message || t("product.loadFailed"));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReviews = async () => {
        try {
            setReviewLoading(true);
            const res = await customerApi.getProductReviews(id);
            if (res.data.success) {
                setReviews(res.data.results || []);
            }
        } catch (error) {
            console.error("Fetch reviews error:", error);
        } finally {
            setReviewLoading(false);
        }
    };

    useEffect(() => {
        setNewReview({ rating: 5, comment: '' });
        setLocalHasReviewed(false);
        setReviews([]);
        if (id) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (id && product) {
            fetchData(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLocation?.latitude, currentLocation?.longitude]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!newReview.comment.trim()) return;

        try {
            setIsSubmittingReview(true);
            const res = await customerApi.submitReview({
                productId: id,
                rating: newReview.rating,
                comment: newReview.comment
            });
            if (res.data.success) {
                showToast(t('product.reviewSubmitted'), "success");
                setNewReview({ rating: 5, comment: '' });
                setLocalHasReviewed(true);
                setReviews(prev => [{
                    _id: 'temp-' + Date.now(),
                    rating: newReview.rating,
                    comment: newReview.comment,
                    createdAt: new Date().toISOString(),
                    userId: { name: 'You' },
                    status: 'pending'
                }, ...prev]);
            }
        } catch (error) {
            showToast(error.response?.data?.message || t('product.reviewFailed'), "error");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleToggleWishlist = () => {
        if (!product) return;
        toggleWishlistGlobal(product);
        const isWishlisted = isInWishlist(product.id);
        showToast(
            isWishlisted ? t('wishlist.removedItem', { name: itemName(product) }) : t('wishlist.addedItem', { name: itemName(product) }),
            isWishlisted ? 'info' : 'success'
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-white py-20 px-8 flex flex-col items-center justify-center text-center">
                <div className="w-64 h-64 mb-6">
                    {noServiceData ? (
                        <Lottie animationData={noServiceData} loop={true} />
                    ) : (
                        <div className="w-64 h-64" />
                    )}
                </div>
                <h3 className="text-3xl font-[1000] text-slate-800 tracking-tighter mb-4 uppercase">
                    {t('product.item')} <span className="text-primary">{t('home.unavailable')}</span>
                </h3>
                <p className="text-slate-500 font-bold text-sm max-w-[280px] mb-8 leading-relaxed">
                    {error === "Product not available in your area" 
                        ? t('product.notAvailableHere') 
                        : t('product.loadDetailsFailed')}
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button 
                        onClick={() => navigate('/user')}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-black/10"
                    >
                        {t('common.goHome')}
                    </button>
                    <button 
                        onClick={() => navigate(-1)}
                        className="px-10 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        {t('product.goBack')}
                    </button>
                </div>
            </div>
        );
    }

    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const variantKey = hasVariants ? getVariantKey(selectedVariant) : "";
    const cartItem = cart.find(
        (item) =>
            !item.packageId && // combo items are separate cart lines with fixed qty
            `${item.id || item._id}::${String(item.variantSku || "").trim()}` ===
            `${product.id}::${variantKey}`,
    );
    const quantity = cartItem ? cartItem.quantity : 0;
    const isWishlisted = isInWishlist(product.id);

    const currentStock = hasVariants && selectedVariant
        ? getVariantStock(selectedVariant, product)
        : Number(product.stock || 0);
    const pricing = hasVariants && selectedVariant
        ? getVariantPricing(selectedVariant, product)
        : getVariantPricing({ price: product.price, salePrice: product.salePrice }, product);
    const lowStockAt = product.lowStockAlert || 5;

    return (
        <div className="relative z-10 py-8 w-full max-w-[1920px] mx-auto px-4 md:px-[50px] animate-in fade-in duration-700 mt-24">
            <Link to={-1} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary font-bold mb-6 transition-colors group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> {t('common.back')}
            </Link>

            <div className="flex flex-col lg:flex-row gap-10 xl:gap-16">
                <div className="lg:w-[45%] xl:w-[40%] space-y-4">
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-white border border-slate-100 shadow-sm transition-all hover:shadow-xl group">
                        <img
                            src={applyCloudinaryTransform(activeImage, "f_auto,q_auto,w_800")}
                            alt={itemName(product)}
                            loading="lazy"
                            className="w-full h-full object-contain p-2 md:p-4 transition-transform duration-700 group-hover:scale-105"
                        />
                        <button
                            onClick={handleToggleWishlist}
                            className={cn(
                                "absolute top-5 right-5 p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110",
                                isWishlisted ? "bg-red-50 text-red-500" : "bg-white text-slate-400"
                            )}
                        >
                            <Heart size={20} className={cn(isWishlisted && "fill-current")} />
                        </button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {product.images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImage(img)}
                                className={cn(
                                    "relative h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden flex-shrink-0 transition-all border-2",
                                    activeImage === img ? "border-primary shadow-lg scale-95" : "border-transparent opacity-70 hover:opacity-100"
                                )}
                            >
                                <img src={applyCloudinaryTransform(img, "f_auto,q_auto,w_150")} alt={t('product.imageN', { n: idx + 1 })} loading="lazy" className="w-full h-full object-contain p-1" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:w-[55%] xl:w-[60%] space-y-6 md:space-y-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-primary/20">
                                {getLocalizedName(product.categoryId) || t('product.essential')}
                            </span>
                            <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-3 py-0.5 rounded-full text-xs">
                                <Star size={12} fill="currentColor" /> 4.8 ({reviews.length > 0 ? reviews.length : '120+'})
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight mb-3">
                            {itemName(product)}
                        </h1>

                        <div className="flex items-baseline gap-4 mb-5">
                            <span className="text-4xl font-black text-primary">₹{pricing.displayPrice}</span>
                            {pricing.originalPrice && (
                                <span className="text-lg text-slate-400 line-through font-bold">₹{pricing.originalPrice}</span>
                            )}
                            {pricing.discountPercent > 0 && (
                                <span className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-lg font-black uppercase">
                                    {pricing.discountPercent}% OFF
                                </span>
                            )}
                        </div>

                        {hasVariants && (
                            <div className="mb-5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('product.selectVariant')}</h4>
                                <div className="flex gap-2.5 flex-wrap">
                                    {product.variants.map((v, idx) => {
                                        const isSelected = getVariantKey(selectedVariant) === getVariantKey(v);
                                        const isOos = getVariantStock(v, product) <= 0;
                                        return (
                                            <button
                                                key={getVariantKey(v) || idx}
                                                onClick={() => setSelectedVariant(v)}
                                                className={cn(
                                                    "px-4 py-2 font-black rounded-xl text-xs transition-all border-2 bg-white",
                                                    isSelected ? "border-primary text-primary shadow-sm" : "border-slate-100 text-slate-500 hover:border-slate-200",
                                                    isOos && !isSelected && "opacity-60"
                                                )}
                                            >
                                                {v.name}
                                                {isOos && <span className="ml-1 text-[10px] font-semibold text-red-500">(Out of stock)</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <p className="text-slate-600 text-lg leading-relaxed mb-6 font-medium max-w-2xl">
                            {product.description || t('product.defaultDescription')}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        {currentStock <= 0 ? (
                            <div className="flex-1 bg-gray-100 text-gray-400 h-16 w-full sm:w-64 rounded-2xl font-black text-lg flex items-center justify-center gap-2 border border-gray-200 uppercase tracking-widest">
                                {t('product.outOfStockCaps')}
                            </div>
                        ) : quantity > 0 ? (
                            <div className="flex items-center bg-primary text-primary-foreground rounded-2xl h-16 w-full sm:w-auto px-2 shadow-xl shadow-brand-100">
                                <button
                                    onClick={() => updateQuantity(product.id, -1, variantKey)}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all"
                                >
                                    <Minus size={24} strokeWidth={3} />
                                </button>
                                <span className="w-16 text-center font-black text-xl">{quantity}</span>
                                <button
                                    disabled={quantity >= currentStock}
                                    onClick={() => {
                                        if (quantity >= currentStock) {
                                            showToast(t('product.onlyUnitsAvailable', { count: currentStock }), "error");
                                            return;
                                        }
                                        updateQuantity(product.id, 1, variantKey);
                                    }}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={24} strokeWidth={3} />
                                </button>
                            </div>
                        ) : (
                            <Button
                                onClick={async () => {
                                    if (currentStock <= 0) {
                                        showToast(t('product.outOfStockToast'), "error");
                                        return;
                                    }
                                    const added = await addToCart({
                                        ...product,
                                        variantSku: variantKey,
                                        variantName: String(selectedVariant?.name || "").trim(),
                                    });
                                    if (added === false) return;
                                    showToast(t('cart.addedItem', { name: itemName(product) }), 'success');
                                }}
                                className="h-16 w-full sm:w-64 bg-primary hover:bg-[var(--brand-400)] text-white text-lg font-black rounded-2xl shadow-xl transition-all hover:-translate-y-1"
                            >
                                <Plus className="mr-2" size={24} strokeWidth={3} /> {t('product.addToCartCaps')}
                            </Button>
                        )}

                        <div className="flex flex-col gap-1 text-center sm:text-left">
                            <span className="text-xs font-black text-primary uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                                <ShieldCheck size={14} /> {t('product.qualityGuaranteed')}
                            </span>
                            <span className="text-sm font-bold text-slate-400 flex items-center justify-center sm:justify-start gap-1">
                                <Clock size={14} /> {t('product.deliveredIn', { time: translateEta(t, '10-15 mins') })}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('product.weight')}</p>
                            <p className="text-sm font-black text-slate-800">{selectedVariant?.name || product.weight || '1 unit'}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('product.stock')}</p>
                            <p className={`text-sm font-black ${currentStock <= 0 ? "text-red-500" : currentStock <= lowStockAt ? "text-orange-500" : "text-slate-800"}`}>
                                {currentStock <= 0 ? t('product.outOfStock') : currentStock <= lowStockAt ? t('product.onlyLeft', { count: currentStock }) : t('product.inStock')}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('product.brand')}</p>
                            <p className="text-sm font-black text-slate-800">{product.brand || t('product.premium')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-20 border-t border-slate-100 pt-16">
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="lg:w-[40%]">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-24">
                            <h3 className="text-2xl font-black text-slate-800 mb-2">{t('product.writeReview')}</h3>
                            <p className="text-slate-500 font-medium mb-6 text-sm">{t('product.shareExperienceWith')}</p>
                            {product?.hasReviewed || localHasReviewed ? (
                                <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100 text-center mt-6">
                                    <p className="text-sm font-bold text-primary">{t('product.alreadyReviewed')}</p>
                                </div>
                            ) : product?.hasPurchased ? (
                                <form onSubmit={handleReviewSubmit} className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('product.yourRating')}</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setNewReview({ ...newReview, rating: star })}
                                                    className={cn(
                                                        "h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                                                        newReview.rating >= star ? "bg-orange-50 text-orange-500" : "bg-slate-50 text-slate-300"
                                                    )}
                                                >
                                                    <Star className={cn("h-6 w-6", newReview.rating >= star && "fill-current")} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('product.comment')}</label>
                                        <textarea
                                            value={newReview.comment}
                                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                            placeholder={t('product.likeDislike')}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold min-h-[120px] outline-none ring-1 ring-transparent focus:ring-primary/20 transition-all"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmittingReview}
                                        className="w-full h-12 bg-primary hover:opacity-90 text-white font-black rounded-xl text-xs uppercase tracking-[0.1em] transition-all shadow-lg shadow-brand-100"
                                    >
                                        {isSubmittingReview ? t('wallet.submitting') : t('product.postReview')}
                                    </Button>
                                </form>
                            ) : (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center mt-6">
                                    <p className="text-sm font-bold text-slate-500">{t('product.mustPurchaseReceive')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:w-[60%] space-y-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-3xl font-black text-slate-800">{t('product.customerReviews')}</h3>
                            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
                                <MessageSquare size={18} className="text-primary" />
                                <span className="font-black text-primary">{t('product.verifiedCount', { count: reviews.length })}</span>
                            </div>
                        </div>

                        {reviewLoading ? (
                            <div className="flex justify-center p-20">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : reviews.length > 0 ? (
                            <div className="space-y-6">
                                {reviews.map((review) => (
                                    <div key={review._id} className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xl">
                                                    {review.userId?.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800">
                                                        {review.userId?.name || t('product.anonymous')}
                                                        {review.status === 'pending' && <span className="ml-2 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded uppercase">{t('orderStatus.pending')}</span>}
                                                    </h4>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={12}
                                                                className={cn(i < review.rating ? "text-orange-400 fill-orange-400" : "text-slate-200")}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </div>
                                        <p className="text-slate-600 font-medium leading-relaxed">{review.comment}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 font-black uppercase text-sm">{t('product.noReviews')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
