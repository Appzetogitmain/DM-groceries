import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ProductDetailContext = createContext();

export const useProductDetail = () => {
    const context = useContext(ProductDetailContext);
    if (!context) {
        // console.warn('useProductDetail used outside Provider');
        return {};
    }
    return context;
};

export const ProductDetailProvider = ({ children }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Track the path we were on before opening the product
    const previousPathRef = React.useRef(null);

    const openProduct = useCallback((product) => {
        const pid = product?.id || product?._id;
        if (!pid) return;
        previousPathRef.current = location.pathname + location.search;
        setSelectedProduct(product);
        setIsOpen(true);
        // Push the product URL without a full navigation/re-render
        window.history.pushState({ productSheet: true, productId: pid }, '', `/product/${pid}`);
    }, [location.pathname, location.search]);

    const closeProduct = useCallback(() => {
        setIsOpen(false);
        // Navigate back to restore the previous URL
        if (previousPathRef.current) {
            window.history.pushState(null, '', previousPathRef.current);
            previousPathRef.current = null;
        }
        // Delay clearing product to allow close animation to finish
        setTimeout(() => setSelectedProduct(null), 300);
    }, []);

    // Handle browser back button
    useEffect(() => {
        const handlePopState = (e) => {
            if (isOpen) {
                setIsOpen(false);
                previousPathRef.current = null;
                setTimeout(() => setSelectedProduct(null), 300);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isOpen]);

    const value = useMemo(
        () => ({ selectedProduct, isOpen, openProduct, closeProduct }),
        [selectedProduct, isOpen, openProduct, closeProduct]
    );

    return (
        <ProductDetailContext.Provider value={value}>
            {children}
        </ProductDetailContext.Provider>
    );
};
