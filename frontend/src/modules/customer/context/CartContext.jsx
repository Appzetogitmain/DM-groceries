import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { customerApi } from "../services/customerApi";
import { useAuth } from "../../../core/context/AuthContext";
import { getJSON, setJSON, remove as removeStorage, STORAGE_KEYS } from "@core/utils/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CartContext = createContext();

const loadGuestCart = () => {
  const parsed = getJSON(STORAGE_KEYS.CART, []);
  if (!Array.isArray(parsed)) {
    removeStorage(STORAGE_KEYS.CART);
    return [];
  }
  return parsed;
};

/**
 * Reliably extract a plain-string seller ID from any format:
 *   - populated object: { _id: "abc", shopName: "..." } → "abc"
 *   - raw ObjectId (after JSON): "abc" → "abc"
 *   - undefined / null → ""
 */
const extractSellerId = (item) => {
  // Try item.sellerId first, then item.productId?.sellerId (for raw cart shapes)
  const raw = item?.sellerId ?? item?.productId?.sellerId ?? null;
  if (!raw) return "";
  if (typeof raw === "object" && raw !== null) {
    // Populated object like { _id: "...", shopName: "..." }
    return String(raw._id || raw.id || "");
  }
  return String(raw);
};

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(() => loadGuestCart());

  const [loading, setLoading] = useState(false);
  const pendingRequestsRef = React.useRef(0);
  const lsDebounceRef = useRef(null);
  const [pendingVendorProduct, setPendingVendorProduct] = useState(null);
  const [pendingVendorPackage, setPendingVendorPackage] = useState(null);
  const [pendingVendorList, setPendingVendorList] = useState(null);

  // Clear cart locally when user logs out is handled by the useEffect dependency on isAuthenticated
  const normalizeBackendCart = (items) => {
    if (!items) return [];
    return items.map((item) => {
      const product = item.productId;
      const variantKey = String(item.variantSku || "").trim();
      const { price, salePrice, variantName } = resolveVariantPricing(product, variantKey);
      
      const isPkg = Boolean(item.packageId);
      const pkgObj = typeof item.packageId === "object" ? item.packageId : null;
      const pkgPrice = Number(item.packagePricePerUnit);
      const origPrice = Number(item.originalPrice);

      const effectiveSalePrice = isPkg && !isNaN(pkgPrice) && pkgPrice > 0 ? pkgPrice : salePrice;
      const effectiveRegularPrice = isPkg && !isNaN(origPrice) && origPrice > 0 ? origPrice : price;

      return {
        ...product,
        id: product?._id, // Normalize ID
        sellerId: extractSellerId(product), // Always store as plain string
        quantity: item.quantity,
        variantSku: variantKey,
        variantName,
        price: effectiveRegularPrice,
        salePrice: effectiveSalePrice,
        image: product?.mainImage, // Handle mapping for frontend
        packageId: pkgObj?._id || item.packageId || null,
        packageName: pkgObj?.name || "",
        packagePricePerUnit: isPkg && !isNaN(pkgPrice) && pkgPrice > 0 ? pkgPrice : null,
        originalPrice: isPkg && !isNaN(origPrice) && origPrice > 0 ? origPrice : null,
      };
    });
  };

  const resolveVariantPricing = (product, variantSku = "") => {
    const normalizedKey = String(variantSku || "").trim();
    if (!normalizedKey) {
      return {
        price: Number(product?.price || 0),
        salePrice: Number(product?.salePrice || 0),
        variantName: "",
      };
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const hit = variants.find((v) => {
      const sku = String(v?.sku || "").trim();
      const name = String(v?.name || "").trim();
      return (sku && sku === normalizedKey) || (!sku && name === normalizedKey) || name === normalizedKey;
    });
    return {
      price: Number(hit?.price || product?.price || 0),
      salePrice: Number(hit?.salePrice || 0),
      variantName: String(hit?.name || "").trim(),
    };
  };

  const syncCart = (backendItems) => {
    // Only update state from backend if no more pending optimistic updates
    if (pendingRequestsRef.current === 0) {
      setCart(normalizeBackendCart(backendItems));
    }
  };

  const fetchCart = async () => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const response = await customerApi.getCart();
        setCart(normalizeBackendCart(response.data.result.items));
      } catch (error) {
        console.error("Failed to fetch cart from backend", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch cart from backend on mount or authentication change
  useEffect(() => {
    if (isAuthenticated) {
      // Cancel any pending guest-mode write that could otherwise overwrite
      // the authenticated state with stale guest data after login.
      clearTimeout(lsDebounceRef.current);
      
      const localCart = loadGuestCart();
      // The legacy guest cart is no longer authoritative for this user; drop
      // it so a future logout doesn't resurface another account's items.
      removeStorage(STORAGE_KEYS.CART);
      
      const syncAndFetch = async () => {
        if (localCart && localCart.length > 0) {
          for (const item of localCart) {
            try {
              await customerApi.addToCart({
                productId: item.id || item._id,
                variantSku: String(item.variantSku || "").trim(),
                quantity: item.quantity,
              });
            } catch (err) {
              console.error("Error syncing guest cart item:", err);
            }
          }
        }
        await fetchCart();
      };
      
      syncAndFetch();
    } else {
      setCart(loadGuestCart());
    }
  }, [isAuthenticated]);

  // Save local cart to localStorage (fallback/guest mode) — debounced to 300 ms
  useEffect(() => {
    if (isAuthenticated) return;           // backend is source of truth

    clearTimeout(lsDebounceRef.current);
    lsDebounceRef.current = setTimeout(() => {
      setJSON(STORAGE_KEYS.CART, cart);
    }, 300);

    return () => {
      if (isAuthenticated) return;
      // Flush on unmount — no data loss
      clearTimeout(lsDebounceRef.current);
      setJSON(STORAGE_KEYS.CART, cart);
    };
  }, [cart, isAuthenticated]);

  const getCartItemKey = (productId, variantSku = "", packageId = "") => {
    return `${productId}::${String(variantSku || "").trim()}::${String(packageId || "").trim()}`;
  };

  const performAddToCart = async (product, options = {}) => {
    const targetQty = Math.max(1, Number(options.quantity || product.targetQuantity || 1));
    const variantSku = String(product?.variantSku || product?.variantName || "").trim();
    const id = product.id || product._id;
    const key = getCartItemKey(id, variantSku, "");
    const { price, salePrice, variantName } = resolveVariantPricing(product, variantSku);

    // Optimistic UI update for instant feedback
    setCart((prev) => {
      const existingItem = prev.find(
        (item) => getCartItemKey(item.id || item._id, item.variantSku, item.packageId) === key,
      );
      if (existingItem) {
        return prev.map((item) =>
          getCartItemKey(item.id || item._id, item.variantSku, item.packageId) === key
            ? { ...item, quantity: item.quantity + targetQty }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...product,
          id,
          _id: id,
          sellerId: extractSellerId(product), // Always store as plain string
          variantSku,
          variantName,
          price,
          salePrice,
          packageId: null,
          packageName: "",
          quantity: targetQty,
          image: product.image || product.mainImage,
        },
      ];
    });

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.addToCart({
          productId: id,
          variantSku,
          quantity: targetQty,
        });
        pendingRequestsRef.current -= 1;
        await syncCart(response.data.result.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error adding to cart on backend", error);
        // Re-fetch entire cart to ensure consistency on error
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const performAddPackageItemToCart = async ({ product, pkg, itemData, quantity = 1 }) => {
    const variantSku = String(product?.variantSku || product?.variantName || "").trim();
    const id = product.id || product._id;
    const pkgId = String(pkg._id || pkg.id || "");
    const pkgName = pkg.name || "Combo Package";
    const packagePricePerUnit = Number(
      itemData.packagePricePerUnit ?? itemData.priceAtAddition ?? product.salePrice ?? product.price ?? 0
    );
    const originalPrice = Number(
      itemData.originalPrice ?? itemData.priceAtAddition ?? product.price ?? 0
    );
    const key = getCartItemKey(id, variantSku, pkgId);

    setCart((prev) => {
      const existingItem = prev.find(
        (item) => getCartItemKey(item.id || item._id, item.variantSku, item.packageId) === key,
      );
      if (existingItem) {
        return prev.map((item) =>
          getCartItemKey(item.id || item._id, item.variantSku, item.packageId) === key
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...product,
          id,
          _id: id,
          sellerId: extractSellerId(product) || extractSellerId(pkg),
          variantSku,
          variantName: product.variantName || "",
          price: originalPrice,
          salePrice: packagePricePerUnit,
          packageId: pkgId,
          packageName: pkgName,
          packagePricePerUnit,
          originalPrice,
          quantity,
          image: product.image || product.mainImage,
        },
      ];
    });

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.addToCart({
          productId: id,
          variantSku,
          quantity,
          packageId: pkgId,
        });
        pendingRequestsRef.current -= 1;
        await syncCart(response.data.result.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        const errMsg = error.response?.data?.message || error.message || "Failed to add package item";
        console.error("Error adding package item to cart backend:", errMsg, error);
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  /**
   * addToCart — public API.
   * Returns `true` if the item was added (or queued for adding).
   * Returns `false` if the vendor-conflict popup was shown instead
   * (so callers like ProductDetailSheet can skip their success toast).
   */
  const addToCart = async (product) => {
    // Check if adding product from a different vendor/seller
    if (cart.length > 0) {
      const existingSellerId = extractSellerId(cart[0]);
      const newSellerId = extractSellerId(product);

      if (existingSellerId && newSellerId && existingSellerId !== newSellerId) {
        // Different vendor detected → show confirmation popup
        setPendingVendorProduct(product);
        return false; // blocked — popup shown
      }
    }
    
    await performAddToCart(product);
    return true; // added successfully
  };

  const addPackageToCart = async (pkg) => {
    if (!pkg?.items || !Array.isArray(pkg.items) || pkg.items.length === 0) {
      return false;
    }

    const packageSellerId =
      extractSellerId(pkg) ||
      extractSellerId(pkg.sellerId) ||
      extractSellerId(pkg.items[0]?.productId) ||
      "";

    if (cart.length > 0) {
      const existingSellerId = extractSellerId(cart[0]);
      if (existingSellerId && packageSellerId && existingSellerId !== packageSellerId) {
        setPendingVendorPackage(pkg);
        setPendingVendorProduct(pkg.items[0]?.productId || { sellerId: packageSellerId });
        return false;
      }
    }

    for (const it of pkg.items) {
      const prod = it.productId;
      if (!prod) continue;
      const targetQty = Math.max(1, Number(it.quantity) || 1);
      await performAddPackageItemToCart({
        product: prod,
        pkg,
        itemData: it,
        quantity: targetQty,
      });
    }
    return true;
  };

  const performAddListItemsToCart = async (list) => {
    for (const it of list?.items || []) {
      const prod = it.productId?._id ? it.productId : it;
      const targetQty = Math.max(1, Number(it.quantity) || 1);
      await performAddToCart(prod, { quantity: targetQty });
    }
    if (list?._id) {
      try {
        await customerApi.addCustomerListToCart(list._id, { replaceCart: true });
      } catch (e) {
        // Non-blocking
      }
    }
  };

  const addCustomListToCart = async (list) => {
    if (!list?.items || !Array.isArray(list.items) || list.items.length === 0) {
      return false;
    }

    const listSellerId =
      extractSellerId(list.sellerId) ||
      extractSellerId(list.items[0]?.productId) ||
      "";

    if (cart.length > 0) {
      const existingSellerId = extractSellerId(cart[0]);
      if (existingSellerId && listSellerId && existingSellerId !== listSellerId) {
        setPendingVendorList(list);
        setPendingVendorProduct(list.items[0]?.productId || { sellerId: listSellerId });
        return false;
      }
    }

    await performAddListItemsToCart(list);
    return true;
  };

  const confirmVendorReplace = async () => {
    if (!pendingVendorProduct && !pendingVendorList && !pendingVendorPackage) return;
    const productToAdd = pendingVendorProduct;
    const listToAdd = pendingVendorList;
    const packageToAdd = pendingVendorPackage;

    setPendingVendorProduct(null);
    setPendingVendorList(null);
    setPendingVendorPackage(null);

    await clearCart();

    if (packageToAdd) {
      for (const it of packageToAdd.items || []) {
        const prod = it.productId;
        if (!prod) continue;
        const targetQty = Math.max(1, Number(it.quantity) || 1);
        await performAddPackageItemToCart({
          product: prod,
          pkg: packageToAdd,
          itemData: it,
          quantity: targetQty,
        });
      }
      toast.success(`Added "${packageToAdd.name}" (${packageToAdd.items?.length || 0} items) to your cart!`);
    } else if (listToAdd) {
      await performAddListItemsToCart(listToAdd);
    } else if (productToAdd && !productToAdd.isPlaceholder) {
      await performAddToCart(productToAdd);
    }
  };

  const cancelVendorReplace = () => {
    setPendingVendorProduct(null);
    setPendingVendorList(null);
    setPendingVendorPackage(null);
  };

  const removeFromCart = async (productId, variantSku = "", packageId = "") => {
    const normalizedVariantSku = String(variantSku || "").trim();
    const normalizedPackageId = String(packageId || "").trim();
    const key = getCartItemKey(productId, normalizedVariantSku, normalizedPackageId);

    // Optimistic update
    setCart((prev) =>
      prev.filter(
        (item) =>
          getCartItemKey(item.id || item._id, item.variantSku, item.packageId) !== key,
      ),
    );

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.removeFromCart(
          productId,
          normalizedVariantSku,
          normalizedPackageId,
        );
        pendingRequestsRef.current -= 1;
        await syncCart(response.data.result.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error removing from cart on backend", error);
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const updateQuantity = async (productId, delta, variantSku = "", packageId = "") => {
    const normalizedVariantSku = String(variantSku || "").trim();
    const normalizedPackageId = String(packageId || "").trim();
    const key = getCartItemKey(productId, normalizedVariantSku, normalizedPackageId);
    const currentItem = cart.find(
      (item) =>
        getCartItemKey(item.id || item._id, item.variantSku, item.packageId) === key,
    );
    if (!currentItem) return;

    const newQty = Math.max(0, currentItem.quantity + delta);

    if (newQty === 0) {
      removeFromCart(productId, normalizedVariantSku, normalizedPackageId);
      return;
    }

    // Optimistic update
    setCart((prev) =>
      prev.map((item) => {
        if (
          getCartItemKey(item.id || item._id, item.variantSku, item.packageId) === key
        ) {
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.updateCartQuantity({
          productId,
          quantity: newQty,
          variantSku: normalizedVariantSku,
          packageId: normalizedPackageId || null,
        });
        pendingRequestsRef.current -= 1;
        await syncCart(response.data.result.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error updating quantity on backend", error);
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await customerApi.clearCart();
        setCart([]);
      } catch (error) {
        console.error("Error clearing cart on backend", error);
      }
    } else {
      setCart([]);
    }
  };

  const cartTotal = cart.reduce((total, item) => {
    const packPrice = Number(item.packagePricePerUnit);
    const sale = Number(item.salePrice || 0);
    const mrp = Number(item.price || 0);
    const unit =
      !isNaN(packPrice) && packPrice > 0
        ? packPrice
        : sale > 0 && sale < mrp
          ? sale
          : mrp;
    return total + unit * Number(item.quantity || 0);
  }, 0);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartValue = useMemo(() => ({
    cart,
    addToCart,
    addPackageToCart,
    addCustomListToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    loading,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cart, cartTotal, cartCount, loading]);

  return (
    <CartContext.Provider value={cartValue}>
      {children}
      <Dialog open={Boolean(pendingVendorProduct || pendingVendorPackage || pendingVendorList)} onOpenChange={(open) => !open && cancelVendorReplace()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace cart items?</DialogTitle>
            <DialogDescription>
              Do you want to replace your current cart? Your cart currently contains items from a different store.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={cancelVendorReplace}>
              No
            </Button>
            <Button variant="default" className="bg-[#1A4516] hover:bg-[#1A4516]/90 text-white" onClick={confirmVendorReplace}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CartContext.Provider>
  );
};
