import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
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
  Pencil,
  RotateCcw,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useCart } from "../context/CartContext";
import { useLocation } from "../context/LocationContext";
import { useAuth } from "@core/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Modal from "@/shared/components/ui/Modal";
import ListReminderPickerModal from "../components/list/ListReminderPickerModal";

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

const CreateListPage = () => {
  const navigate = useNavigate();
  const { id: editListId } = useParams();
  const [searchParams] = useSearchParams();
  const templateParam = searchParams.get("template");
  const { currentLocation } = useLocation();
  const { isAuthenticated } = useAuth();
  const { addCustomListToCart } = useCart();

  const [listName, setListName] = useState(templateParam || "Monthly Essentials Basket");
  const [isEditingName, setIsEditingName] = useState(false);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showItemsDrawer, setShowItemsDrawer] = useState(false);

  // Store conflict dialog state
  const [storeConflict, setStoreConflict] = useState(null);

  // Restock reminder picker (shown before "Order Basket Now")
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [savedReminderDays, setSavedReminderDays] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);

  // If editing existing list, load it
  useEffect(() => {
    if (!editListId) return;
    const loadList = async () => {
      try {
        const res = await customerApi.getCustomerListById(editListId);
        if (res.data?.success && res.data.result) {
          const l = res.data.result;
          setListName(l.name || "My Grocery Basket");
          setSavedReminderDays(Number(l.reminderDays) || 0);
          setItems(
            (l.items || []).map((it) => {
              const prod = it.productId?._id ? it.productId : it;
              return {
                productId: String(prod._id || prod.id),
                name: prod.name,
                price: Number(prod.salePrice || prod.price || it.unitPriceSnapshot || 0),
                mainImage: prod.mainImage || prod.image,
                stock: prod.stock,
                quantity: Math.max(1, Number(it.quantity) || 1),
                sellerId: extractSellerId(prod) || String(l.sellerId || ""),
                sellerName: extractSellerName(prod),
              };
            })
          );
        }
      } catch (err) {
        toast.error("Failed to load list details");
      }
    };
    loadList();
  }, [editListId]);

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await customerApi.getCategories();
        if (res.data?.success) {
          const list = res.data.results || res.data.result || [];
          setCategories(list.filter((c) => c.type === "category"));
        }
      } catch (e) {}
    };
    fetchCategories();
  }, []);

  // Fetch products with location lat/lng
  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoadingProducts(true);
      try {
        const params = {
          limit: 100,
        };

        const lat = Number(currentLocation?.latitude);
        const lng = Number(currentLocation?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          params.lat = lat;
          params.lng = lng;
        }

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        if (selectedCategory && selectedCategory !== "all") {
          params.categoryId = selectedCategory;
        }

        const res = await customerApi.getProducts(params);
        if (res.data?.success) {
          const raw = res.data.results || res.data.result || [];
          const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
          setProducts(list);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Error fetching products for list builder:", err);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    const timer = setTimeout(fetchCatalog, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, currentLocation?.latitude, currentLocation?.longitude]);

  // Active seller bound to this list
  const activeSeller = useMemo(() => {
    if (items.length === 0) return null;
    return {
      sellerId: items[0].sellerId,
      sellerName: items[0].sellerName || "Selected Store",
    };
  }, [items]);

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

  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
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

      if (editListId) {
        await customerApi.updateCustomerList(editListId, payload);
        toast.success("List updated successfully!");
      } else {
        await customerApi.createCustomerList(payload);
        toast.success("List saved to your profile!");
      }

      navigate("/user/lists");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save list");
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
    let resolvedListId = editListId || undefined;

    // Save list if logged in
    if (isAuthenticated) {
      try {
        const payload = {
          name: listName.trim() || "My Grocery Basket",
          sellerId: activeSeller?.sellerId,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPriceSnapshot: it.price,
          })),
          ...(reminderDays !== undefined ? { reminderDays } : {}),
        };
        if (editListId) {
          await customerApi.updateCustomerList(editListId, payload);
        } else {
          const res = await customerApi.createCustomerList(payload);
          resolvedListId = res.data?.result?._id || resolvedListId;
        }
      } catch (e) {}
    }

    setShowReminderPicker(false);
    setIsOrdering(false);

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

    try {
      localStorage.setItem(
        "DM_ACTIVE_LIST_ORDER",
        JSON.stringify({
          listId: resolvedListId,
          listName: listName.trim() || "My Grocery Basket",
          items: items.map((it) => it.productId),
        })
      );
    } catch (e) {}

    const added = await addCustomListToCart(customListObj);
    if (added) {
      toast.success("Loaded list into your cart!");
      navigate("/user/checkout");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] pt-4 md:pt-6 pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Navigation & Title Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/user/lists")}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ChevronLeft size={16} />
            My Lists
          </button>

          {activeSeller && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-black">
              <Store size={13} className="text-emerald-700" />
              <span className="truncate max-w-[180px]">{activeSeller.sellerName}</span>
            </div>
          )}
        </div>

        {/* Top List Name Card */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                <Sparkles size={11} className="inline mr-1" />
                Custom Basket Builder
              </span>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    autoFocus
                    className="text-lg md:text-xl font-black text-slate-900 px-2 py-1 rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-md"
                  />
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1 bg-[#1A4516] text-white text-xs font-bold rounded-lg"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    {listName}
                  </h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                    title="Rename List"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500 font-medium mt-1">
                Select products from your local store to assemble your regular basket.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowItemsDrawer(!showItemsDrawer)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs transition flex items-center gap-2"
              >
                <ShoppingBag size={16} className="text-[#1A4516]" />
                Selected Items ({totalItemsCount})
              </button>
            </div>
          </div>

          {/* Included Items Drawer / Panel */}
          {items.length > 0 && (
            <div className={cn("mt-4 pt-4 border-t border-slate-100", !showItemsDrawer && "hidden md:block")}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Basket Items ({items.length} products • {totalItemsCount} units)
                </span>
                <span className="text-xs font-black text-[#1A4516]">
                  Est. Subtotal: ₹{totalEstimatedAmount.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {items.map((it) => (
                  <div
                    key={it.productId}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img
                        src={it.mainImage || "/vegetable-basket-banner.png"}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover bg-white border border-slate-200/60 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{it.name}</p>
                        <p className="text-[10px] text-slate-500">₹{it.price.toFixed(2)} each</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
                        <button
                          onClick={() => handleUpdateQuantity(it.productId, it.quantity - 1)}
                          className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="font-black px-1.5 text-[11px]">{it.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(it.productId, it.quantity + 1)}
                          className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(it.productId)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Catalog Browser */}
        <div className="space-y-4">
          {/* Search Bar & Category Filter Strip */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products to add to your list (e.g., Milk, Tomato, Rice)..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap",
                  selectedCategory === "all"
                    ? "bg-[#1A4516] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat._id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap",
                    selectedCategory === cat._id
                      ? "bg-[#1A4516] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {isLoadingProducts ? (
            <div className="text-center py-20 text-xs text-slate-400 font-medium">
              Loading store products...
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <ShoppingBag size={40} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-black text-slate-800">No products found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try searching for something else or pick a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map((prod) => {
                const prodId = String(prod._id || prod.id);
                const inList = items.find((it) => String(it.productId) === prodId);
                const sellerName = extractSellerName(prod);
                const price = Number(prod.salePrice || prod.price || 0);

                return (
                  <div
                    key={prodId}
                    className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-2 relative">
                        <img
                          src={prod.mainImage || prod.image || "/vegetable-basket-banner.png"}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {inList && (
                          <span className="absolute top-1.5 right-1.5 bg-[#1A4516] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                            x{inList.quantity}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1 mb-0.5">
                        <Store size={11} className="text-emerald-700 shrink-0" />
                        <span className="truncate">{sellerName}</span>
                      </p>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          ₹{price.toFixed(2)}
                        </span>
                        {prod.salePrice && prod.salePrice < prod.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{Number(prod.price).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {inList ? (
                        <div className="flex items-center gap-1 border border-emerald-300 rounded-lg p-0.5 bg-emerald-50 text-emerald-900">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(prodId, inList.quantity - 1)}
                            className="p-1 hover:bg-emerald-100 rounded"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-black text-xs px-1">{inList.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(prodId, inList.quantity + 1)}
                            className="p-1 hover:bg-emerald-100 rounded"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddItem(prod)}
                          className="px-3 py-1.5 rounded-xl bg-[#1A4516] text-white font-black text-xs hover:bg-[#1A4516]/90 transition active:scale-95 shadow-xs flex items-center gap-1"
                        >
                          <Plus size={13} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              {totalItemsCount} items selected
            </span>
            <span className="text-lg md:text-xl font-black text-[#1A4516]">
              ₹{totalEstimatedAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveListOnly}
              disabled={isSaving || items.length === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save List"}
            </button>
            <button
              onClick={handleOrderListNow}
              disabled={items.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#1A4516] text-white font-black text-xs hover:bg-[#1A4516]/90 transition active:scale-95 shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              Order Basket Now <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Restock Reminder Picker */}
      <ListReminderPickerModal
        isOpen={showReminderPicker}
        onClose={() => setShowReminderPicker(false)}
        onConfirm={(days) => proceedToOrderList(days)}
        initialDays={savedReminderDays}
        listName={listName.trim() || "My Grocery Basket"}
        isSubmitting={isOrdering}
      />

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
    </div>
  );
};

export default CreateListPage;
