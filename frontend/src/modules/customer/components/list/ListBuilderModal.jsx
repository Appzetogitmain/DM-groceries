import React, { useState, useEffect, useMemo } from "react";
import Modal from "@/shared/components/ui/Modal";
import { customerApi } from "../../services/customerApi";
import { useCart } from "../../context/CartContext";
import { useLocation } from "../../context/LocationContext";
import { useAuth } from "@core/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Store,
  Sparkles,
  Check,
  AlertTriangle,
  ArrowRight,
  ListPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ListReminderPickerModal from "./ListReminderPickerModal";

const extractSellerId = (product) => {
  if (!product) return "";
  const s = product.sellerId || product.seller;
  if (typeof s === "object" && s !== null) {
    return String(s._id || s.id || "");
  }
  return String(s || "");
};

const extractSellerName = (product) => {
  if (!product) return "Local Store";
  const s = product.sellerId || product.seller;
  if (typeof s === "object" && s !== null) {
    return s.shopName || s.storeName || s.name || "Local Store";
  }
  return "Local Store";
};

const ListBuilderModal = ({
  isOpen,
  onClose,
  initialList = null,
  onListSaved,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { currentLocation } = useLocation();
  const { addCustomListToCart } = useCart();

  const [listName, setListName] = useState(
    initialList?.name || "Monthly Essentials Basket"
  );
  const [items, setItems] = useState(initialList?.items || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Store conflict dialog state
  const [storeConflict, setStoreConflict] = useState(null);

  // Restock reminder picker (shown before "Order Basket Now")
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    if (initialList) {
      setListName(initialList.name || "My Grocery Basket");
      setItems(
        (initialList.items || []).map((it) => {
          const prod = it.productId?._id ? it.productId : it;
          return {
            productId: prod._id || prod.id,
            name: prod.name,
            price: Number(prod.salePrice || prod.price || it.unitPriceSnapshot || 0),
            mainImage: prod.mainImage || prod.image,
            stock: prod.stock,
            quantity: Math.max(1, Number(it.quantity) || 1),
            sellerId: extractSellerId(prod) || String(initialList.sellerId || ""),
            sellerName: extractSellerName(prod),
          };
        })
      );
    } else {
      setListName("Monthly Essentials Basket");
      setItems([]);
    }
  }, [initialList, isOpen]);

  // Active seller bound to this list
  const activeSeller = useMemo(() => {
    if (items.length === 0) return null;
    return {
      sellerId: items[0].sellerId,
      sellerName: items[0].sellerName || "Selected Store",
    };
  }, [items]);

  // Product search
  useEffect(() => {
    if (!isOpen) return;
    const q = searchQuery.trim();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = {
          limit: 20,
        };
        if (q) {
          params.search = q;
        }
        if (currentLocation?.latitude && currentLocation?.longitude) {
          params.lat = currentLocation.latitude;
          params.lng = currentLocation.longitude;
        }
        const res = await customerApi.getProducts(params);
        if (res.data?.success) {
          const raw = res.data.results || res.data.result || [];
          const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
          setSearchResults(list);
        }
      } catch (err) {
        console.error("Failed to search products", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, currentLocation]);

  const handleAddItem = (product) => {
    const prodSellerId = extractSellerId(product);
    const prodSellerName = extractSellerName(product);

    // Cross-seller boundary check
    if (activeSeller && prodSellerId && activeSeller.sellerId !== prodSellerId) {
      setStoreConflict({
        incomingProduct: product,
        currentSellerName: activeSeller.sellerName,
        newSellerName: prodSellerName,
      });
      return;
    }

    const prodId = String(product._id || product.id);
    setItems((prev) => {
      const idx = prev.findIndex((it) => String(it.productId) === prodId);
      if (idx >= 0) {
        return prev.map((it, i) =>
          i === idx ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          productId: prodId,
          name: product.name,
          price: Number(product.salePrice || product.price || 0),
          mainImage: product.mainImage || product.image,
          stock: product.stock,
          quantity: 1,
          sellerId: prodSellerId,
          sellerName: prodSellerName,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        String(it.productId) === String(productId)
          ? { ...it, quantity: newQty }
          : it
      )
    );
  };

  const handleRemoveItem = (productId) => {
    setItems((prev) =>
      prev.filter((it) => String(it.productId) !== String(productId))
    );
  };

  const confirmSwitchStore = () => {
    if (!storeConflict?.incomingProduct) return;
    const p = storeConflict.incomingProduct;
    setStoreConflict(null);
    setItems([
      {
        productId: String(p._id || p.id),
        name: p.name,
        price: Number(p.salePrice || p.price || 0),
        mainImage: p.mainImage || p.image,
        stock: p.stock,
        quantity: 1,
        sellerId: extractSellerId(p),
        sellerName: extractSellerName(p),
      },
    ]);
    toast.info(`Switched list store to ${extractSellerName(p)}`);
  };

  const totalEstimatedAmount = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );
  }, [items]);

  const handleSaveListOnly = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to save your custom list");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one product to your list");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: listName.trim() || "My Grocery Basket",
        sellerId: activeSeller?.sellerId,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPriceSnapshot: it.price,
        })),
      };

      let res;
      if (initialList?._id) {
        res = await customerApi.updateCustomerList(initialList._id, payload);
        toast.success("List updated successfully!");
      } else {
        res = await customerApi.createCustomerList(payload);
        toast.success("List saved to your profile!");
      }

      onListSaved?.(res.data?.result);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save list";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // "Order Basket Now": logged-in users first choose a restock reminder;
  // guests (list can't be saved) go straight to checkout as before.
  const handleOrderListNow = () => {
    if (items.length === 0) {
      toast.error("Add at least one product to your list");
      return;
    }
    if (isAuthenticated) {
      setShowReminderPicker(true);
      return;
    }
    proceedToOrderList();
  };

  const proceedToOrderList = async (reminderDays) => {
    if (items.length === 0) {
      toast.error("Add at least one product to your list");
      return;
    }

    setIsOrdering(true);
    let resolvedListId = initialList?._id || undefined;
    const resolvedListName = listName.trim() || "My Grocery Basket";

    // Save list if logged in
    if (isAuthenticated) {
      try {
        const payload = {
          name: resolvedListName,
          sellerId: activeSeller?.sellerId,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPriceSnapshot: it.price,
          })),
          ...(reminderDays !== undefined ? { reminderDays } : {}),
        };
        if (initialList?._id) {
          await customerApi.updateCustomerList(initialList._id, payload);
        } else {
          const res = await customerApi.createCustomerList(payload);
          resolvedListId = res.data?.result?._id || resolvedListId;
        }
      } catch (e) {
        // Continue to cart even if list save fails
      }
    }

    setShowReminderPicker(false);
    setIsOrdering(false);

    // Tag the upcoming checkout as a list order so the reminder can be armed
    if (resolvedListId) {
      try {
        localStorage.setItem(
          "DM_ACTIVE_LIST_ORDER",
          JSON.stringify({
            listId: resolvedListId,
            listName: resolvedListName,
            items: items.map((it) => it.productId),
          })
        );
      } catch (e) {}
    }

    const customListObj = {
      _id: resolvedListId || "temp-list",
      sellerId: activeSeller?.sellerId,
      items: items.map((it) => ({
        productId: {
          _id: it.productId,
          id: it.productId,
          name: it.name,
          price: it.price,
          salePrice: it.price,
          mainImage: it.mainImage,
          sellerId: it.sellerId,
        },
        quantity: it.quantity,
      })),
    };

    const added = await addCustomListToCart(customListObj);
    if (added) {
      toast.success("Loaded list into your cart!");
      onClose();
      navigate("/user/checkout");
    } else {
      // Vendor conflict modal was shown by CartContext
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialList ? "Edit Grocery List" : "Make Your Own Grocery List"}
      size="xl"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* List Name Banner */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1">
              List / Basket Name
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Monthly Ration, Weekly Veggies, Breakfast Pack"
              className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {activeSeller && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200/90 shadow-2xs self-start sm:self-end">
              <Store size={16} className="text-emerald-700 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                  Single Store Bound
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[140px] block leading-tight">
                  {activeSeller.sellerName}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Products in List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-emerald-700" />
              Included Items ({items.length})
            </h4>
            <span className="text-xs font-extrabold text-[#1A4516] dark:text-emerald-400">
              Est. Total: ₹{totalEstimatedAmount.toFixed(2)}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                No items added yet. Search products below to build your basket!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((it) => (
                <div
                  key={it.productId}
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 shadow-2xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      src={it.mainImage || "/vegetable-basket-banner.png"}
                      alt={it.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {it.name}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        ₹{Number(it.price).toFixed(2)} each
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(it.productId, it.quantity - 1)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-black px-1.5 text-xs min-w-[20px] text-center">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(it.productId, it.quantity + 1)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-700"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="text-xs font-black text-slate-800 dark:text-white min-w-[55px] text-right">
                      ₹{(it.price * it.quantity).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.productId)}
                      className="text-slate-400 hover:text-red-500 p-1 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Catalog / Search Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products to add to your list..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {searchResults.map((prod) => {
              const inList = items.some((it) => String(it.productId) === String(prod._id));
              const prodSeller = extractSellerName(prod);
              return (
                <div
                  key={prod._id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-white border border-slate-200/60 transition gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={prod.mainImage || "/vegetable-basket-banner.png"}
                      alt={prod.name}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ₹{prod.salePrice || prod.price} • <span className="text-emerald-700 font-bold">{prodSeller}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddItem(prod)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1",
                      inList
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-[#1A4516] text-white hover:bg-[#1A4516]/90 active:scale-95"
                    )}
                  >
                    {inList ? <Check size={12} /> : <Plus size={12} />}
                    {inList ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Basket Estimated Total
            </span>
            <span className="text-lg font-black text-[#1A4516]">
              ₹{totalEstimatedAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSaveListOnly}
              disabled={isSaving || items.length === 0}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save List Only"}
            </button>
            <button
              type="button"
              onClick={handleOrderListNow}
              disabled={items.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#1A4516] text-white font-black text-xs hover:bg-[#1A4516]/90 transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              Order Basket Now <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Store Conflict Confirmation Modal */}
      {storeConflict && (
        <Modal
          isOpen={Boolean(storeConflict)}
          onClose={() => setStoreConflict(null)}
          title="Different Store Selected"
          size="sm"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                Your current list contains items from{" "}
                <strong>{storeConflict.currentSellerName}</strong>. Adding items from{" "}
                <strong>{storeConflict.newSellerName}</strong> will clear the current list and start a new basket from this store.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStoreConflict(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                Keep Current List
              </button>
              <button
                type="button"
                onClick={confirmSwitchStore}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1A4516] text-white hover:bg-[#1A4516]/90 transition"
              >
                Switch Store & Start Fresh
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Restock Reminder Picker */}
      <ListReminderPickerModal
        isOpen={showReminderPicker}
        onClose={() => setShowReminderPicker(false)}
        onConfirm={(days) => proceedToOrderList(days)}
        initialDays={initialList?.reminderDays}
        listName={listName.trim() || "My Grocery Basket"}
        isSubmitting={isOrdering}
      />
    </Modal>
  );
};

export default ListBuilderModal;
