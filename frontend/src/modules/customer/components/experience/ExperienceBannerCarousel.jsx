import React from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useProductDetail } from "../../context/ProductDetailContext";
import { motion, useMotionValue } from "framer-motion";
import {
  applyCloudinaryTransform,
  buildCloudinarySrcSet,
  isCloudinaryUrl,
} from "@/core/utils/imageUtils";

import { isMobileOrWebView } from "@/core/utils/deviceUtils";

const BANNER_CHUNK_SIZE = 20;

const ExperienceBannerCarousel = ({ section, items, fullWidth = false, slideGap = 0, edgeToEdge = false }) => {
  if (!items.length) return null;

  const navigate = useNavigate();
  const { openProduct } = useProductDetail();

  const handleBannerClick = React.useCallback((banner) => {
    if (!banner.linkType || banner.linkType === 'none' || !banner.linkValue) return;
    let linkValue = banner.linkValue.trim();
    if (!linkValue) return;

    // If they pasted a full URL, extract the path part if it's for our domain
    if (linkValue.startsWith('http')) {
      try {
        const url = new URL(linkValue);
        if (url.hostname.includes('dmgroceries.com') || url.hostname.includes('localhost')) {
          linkValue = url.pathname + url.search;
        } else if (banner.linkType !== 'url') {
          // If they chose category/product but pasted an external domain URL
          window.open(linkValue, '_blank', 'noopener');
          return;
        }
      } catch (e) {}
    }

    // Now linkValue is either a path (e.g. /category/123) or a pure slug (e.g. 123)
    const slug = linkValue.replace(/^\/+/, ''); 

    switch (banner.linkType) {
      case 'url':
        window.open(linkValue.startsWith('http') ? linkValue : `https://${linkValue}`, '_blank', 'noopener');
        break;
      case 'category':
      case 'subcategory':
        // Extract just the ID/slug from the end, ignoring any 'category/' prefix
        const catId = slug.split('/').pop(); 
        navigate(`/category/${catId}`);
        break;
      case 'product':
        // Extract just the ID from the end, ignoring any 'product/' prefix
        const prodId = slug.split('/').pop(); 
        openProduct({ id: prodId, _id: prodId });
        break;
      default:
        navigate(linkValue.startsWith('/') ? linkValue : `/${linkValue}`);
    }
  }, [navigate, openProduct]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [visibleCount, setVisibleCount] = React.useState(() =>
    Math.min(items.length, BANNER_CHUNK_SIZE)
  );
  const visibleItems = items.slice(0, visibleCount);
  const totalItems = visibleItems.length;
  const x = useMotionValue(0);
  const containerRef = React.useRef(null);
  const hasMore = visibleCount < items.length;

  const loadMore = React.useCallback(() => {
    setVisibleCount((prev) => Math.min(items.length, prev + BANNER_CHUNK_SIZE));
  }, [items.length]);

  React.useEffect(() => {
    setVisibleCount(Math.min(items.length, BANNER_CHUNK_SIZE));
    setActiveIndex(0);
  }, [items.length]);

  // Auto-play logic
  React.useEffect(() => {
    if (totalItems <= 1) return;

    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalItems);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [totalItems]);

  React.useEffect(() => {
    if (!hasMore) return;
    if (activeIndex >= totalItems - 2) {
      loadMore();
    }
  }, [activeIndex, totalItems, hasMore, loadMore]);

  const handleDragEnd = (_, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      // Swipe left -> Next
      setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (info.offset.x > threshold) {
      // Swipe right -> Prev
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const getBannerOptimizedSrc = React.useCallback((url) => {
    if (!url) return url;
    if (!isCloudinaryUrl(url)) return url;
    return applyCloudinaryTransform(url, "f_auto,q_auto,c_scale,w_824");
  }, []);

  return (
    <div className={cn("overflow-hidden touch-pan-y", fullWidth && "w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]")}>
      <motion.div
        ref={containerRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: `-${(activeIndex / totalItems) * 100}%` }}
        transition={isMobileOrWebView() ? { type: "tween", ease: "easeInOut", duration: 0.3 } : { type: "spring", stiffness: 300, damping: 30 }}
        className="flex"
        style={{ width: `${totalItems * 100}%` }}
      >
        {visibleItems.map((banner, idx) => {
          const isClickable = banner.linkType && banner.linkType !== 'none' && banner.linkValue;
          return (
          <div
            key={idx}
            className={cn(
              "relative shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center box-border",
              fullWidth ? "aspect-[2/1] sm:aspect-[21/9] rounded-none px-0" : "aspect-[2/1] sm:aspect-[21/9] px-4 md:px-8 py-2",
              isClickable && "cursor-pointer"
            )}
            style={{ width: `${100 / totalItems}%` }}
            onClick={isClickable ? () => handleBannerClick(banner) : undefined}
          >
            {fullWidth ? (
              <>
                <img
                  src={getBannerOptimizedSrc(banner.imageUrl)}
                  srcSet={
                    isCloudinaryUrl(banner.imageUrl)
                      ? buildCloudinarySrcSet(
                          banner.imageUrl,
                          [{ w: 412 }, { w: 824 }, { w: 1248 }],
                          "f_auto,q_auto,c_scale"
                        )
                      : undefined
                  }
                  sizes="100vw"
                  alt={banner.title || section?.title || "Banner"}
                  className="w-full h-full object-contain object-center pointer-events-none"
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "low"}
                  decoding="async"
                />
                {(banner.title || banner.subtitle) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-5 pb-4 pt-10 md:px-10 md:pb-6 md:pt-16 pointer-events-none">
                    {banner.title && (
                      <h3 className="text-white text-sm md:text-xl font-black tracking-tight drop-shadow-lg leading-tight">{banner.title}</h3>
                    )}
                    {banner.subtitle && (
                      <p className="text-white/80 text-[10px] md:text-sm font-semibold mt-0.5 drop-shadow-md">{banner.subtitle}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="h-full w-full max-w-[560px] md:max-w-full overflow-hidden rounded-3xl bg-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.08)] relative">
                <img
                  src={getBannerOptimizedSrc(banner.imageUrl)}
                  srcSet={
                    isCloudinaryUrl(banner.imageUrl)
                      ? buildCloudinarySrcSet(
                          banner.imageUrl,
                          [{ w: 560 }, { w: 1120 }, { w: 1600 }],
                          "f_auto,q_auto,c_scale"
                        )
                      : undefined
                  }
                  sizes="(max-width: 768px) 100vw, 90vw"
                  alt={banner.title || section?.title || "Banner"}
                  className="w-full h-full object-cover object-center pointer-events-none"
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "low"}
                  decoding="async"
                />
                {(banner.title || banner.subtitle) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pb-3 pt-8 md:px-8 md:pb-5 md:pt-14 rounded-b-3xl pointer-events-none">
                    {banner.title && (
                      <h3 className="text-white text-sm md:text-xl font-black tracking-tight drop-shadow-lg leading-tight">{banner.title}</h3>
                    )}
                    {banner.subtitle && (
                      <p className="text-white/80 text-[10px] md:text-sm font-semibold mt-0.5 drop-shadow-md">{banner.subtitle}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default ExperienceBannerCarousel;
