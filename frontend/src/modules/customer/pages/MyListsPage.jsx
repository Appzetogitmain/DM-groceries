import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ListPlus,
  ShoppingBag,
  Store,
  RotateCcw,
  Pencil,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
  BookmarkCheck,
  PackageCheck,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ListBuilderModal from "../components/list/ListBuilderModal";

const MyListsPage = () => {
  const navigate = useNavigate();
  const { addCustomListToCart, addToCart } = useCart();

  const [activeTab, setActiveTab] = useState("saved"); // 'saved' | 'history'
  const [savedLists, setSavedLists] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedListToEdit, setSelectedListToEdit] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  const fetchSavedLists = async () => {
    try {
      const res = await customerApi.getCustomerLists({ status: "active" });
      if (res.data?.success) {
        setSavedLists(res.data.result || []);
      }
    } catch (err) {
      console.error("Failed to load customer lists", err);
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const listsRes = await customerApi.getCustomerLists({ status: "active" });
      const currentSavedLists = listsRes.data?.success ? (listsRes.data.result || []) : [];
      setSavedLists(currentSavedLists);

      const ordersRes = await customerApi.getMyOrders();
      if (ordersRes.data?.success) {
        const payload = ordersRes.data;
        const rawOrders =
          payload?.result?.items ||
          payload?.results ||
          payload?.result?.orders ||
          (Array.isArray(payload?.result) ? payload.result : []);

        const localPlacedListOrders = (() => {
          try {
            return JSON.parse(localStorage.getItem("DM_PLACED_LIST_ORDERS") || "[]");
          } catch (e) {
            return [];
          }
        })();

        // Filter: ONLY orders associated with a List / Basket!
        const listOnlyOrders = (Array.isArray(rawOrders) ? rawOrders : [])
          .map((order) => {
            // 1. Explicit backend list flag
            if (order.isListOrder || order.listId || order.listName) {
              return {
                ...order,
                isListOrder: true,
                matchedListName: order.listName || "Custom Basket",
              };
            }

            // 2. Local storage list orders tracking
            const orderIdStr = String(order.orderId || order._id);
            const foundInStorage = localPlacedListOrders.find(
              (lo) => lo.orderId && String(lo.orderId) === orderIdStr
            );
            if (foundInStorage) {
              const matchedList = currentSavedLists.find(
                (sl) => String(sl._id) === String(foundInStorage.listId) || sl.name === foundInStorage.listName
              );
              return {
                ...order,
                isListOrder: true,
                matchedListName: foundInStorage.listName || matchedList?.name || "Custom Basket",
                matchedSellerName:
                  matchedList?.sellerId?.shopName ||
                  matchedList?.sellerId?.storeName ||
                  matchedList?.sellerId?.name,
              };
            }

            // 3. Match against user's savedLists products (matches existing list orders)
            const orderProdIds = (order.items || [])
              .map((it) => String(it.product?._id || it.product || it.productId?._id || it.productId || ""))
              .filter(Boolean);

            if (orderProdIds.length > 0) {
              const matchedList = currentSavedLists.find((sl) => {
                const slProdIds = (sl.items || [])
                  .map((it) => String(it.productId?._id || it.productId || ""))
                  .filter(Boolean);
                if (slProdIds.length === 0) return false;
                return (
                  slProdIds.length === orderProdIds.length &&
                  slProdIds.every((id) => orderProdIds.includes(id))
                );
              });

              if (matchedList) {
                const listSellerName =
                  matchedList.sellerId?.shopName ||
                  matchedList.sellerId?.storeName ||
                  matchedList.sellerId?.name;
                return {
                  ...order,
                  isListOrder: true,
                  matchedListName: matchedList.name,
                  matchedSellerName: listSellerName,
                };
              }
            }

            return null;
          })
          .filter(Boolean);

        setPastOrders(listOnlyOrders);
      }
    } catch (err) {
      console.error("Failed to load customer lists & past orders", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleReorderSavedList = async (list) => {
    setActionInProgressId(list._id);
    try {
      try {
        localStorage.setItem(
          "DM_ACTIVE_LIST_ORDER",
          JSON.stringify({
            listId: list._id,
            listName: list.name || "Custom Grocery Basket",
            items: (list.items || [])
              .map((it) => String(it.productId?._id || it.productId || ""))
              .filter(Boolean),
          })
        );
      } catch (e) {}

      const added = await addCustomListToCart(list);
      if (added) {
        toast.success(`Loaded "${list.name}" (${list.items?.length || 0} items) into cart!`);
        navigate("/user/checkout");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load list into cart");
    } finally {
      setTimeout(() => setActionInProgressId(null), 600);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm("Are you sure you want to delete this list?")) return;
    try {
      await customerApi.deleteCustomerList(listId);
      toast.success("List deleted successfully");
      setSavedLists((prev) => prev.filter((l) => l._id !== listId));
    } catch (err) {
      toast.error("Failed to delete list");
    }
  };

  const handleSaveOrderAsList = async (order) => {
    const sellerId =
      order.seller?._id ||
      order.seller?.id ||
      order.seller ||
      order.sellerId?._id ||
      order.sellerId?.id ||
      order.sellerId;

    const items = (order.items || [])
      .map((it) => {
        const prodId =
          it.product?._id ||
          it.product?.id ||
          it.product ||
          it.productId?._id ||
          it.productId?.id ||
          it.productId;
        if (!prodId) return null;
        return {
          productId: String(prodId),
          quantity: it.quantity || 1,
          unitPriceSnapshot: it.price || it.product?.salePrice || it.product?.price || 0,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      toast.error("No valid items in this order to save");
      return;
    }

    try {
      const orderDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          })
        : "Past";
      const payload = {
        name: `Basket from ${orderDate} Order`,
        sellerId: sellerId ? String(sellerId) : undefined,
        items,
      };

      const res = await customerApi.createCustomerList(payload);
      if (res.data?.success) {
        toast.success("Order saved to your Custom Lists!");
        await fetchSavedLists();
        setActiveTab("saved");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save order as list");
    }
  };

  const handleReorderPastOrder = async (order) => {
    setActionInProgressId(order._id);
    try {
      const sellerId =
        order.seller?._id ||
        order.seller?.id ||
        order.seller ||
        order.sellerId?._id ||
        order.sellerId?.id ||
        order.sellerId;

      const items = (order.items || [])
        .map((it) => {
          const prod = it.product || it.productId || {};
          const prodId =
            prod._id ||
            prod.id ||
            (typeof prod === "string" ? prod : null) ||
            it.product ||
            it.productId;
          if (!prodId) return null;
          return {
            productId: {
              _id: String(prodId),
              id: String(prodId),
              name: it.name || prod.name || "Product",
              price: it.price || prod.salePrice || prod.price || 0,
              salePrice: it.price || prod.salePrice || prod.price || 0,
              mainImage: it.image || prod.mainImage,
              sellerId: sellerId ? String(sellerId) : undefined,
            },
            quantity: it.quantity || 1,
          };
        })
        .filter(Boolean);

      if (items.length === 0) {
        toast.error("No valid items in this order to reorder");
        return;
      }

      const customListObj = {
        _id: order._id,
        sellerId: sellerId ? String(sellerId) : undefined,
        items,
      };

      try {
        localStorage.setItem(
          "DM_ACTIVE_LIST_ORDER",
          JSON.stringify({
            listId: order.listId || undefined,
            listName: order.matchedListName || order.listName || "Custom Grocery Basket",
            items: items.map((it) => it.productId._id),
          })
        );
      } catch (e) {}

      const added = await addCustomListToCart(customListObj);
      if (added) {
        toast.success(`Loaded ${items.length} items into cart!`);
        navigate("/user/checkout");
      }
    } catch (err) {
      toast.error("Failed to reorder past items");
    } finally {
      setTimeout(() => setActionInProgressId(null), 600);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] pt-4 md:pt-6 pb-24">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <button
            onClick={() => navigate("/user/lists/create", { state: { fromLists: true } })}
            className="px-4 py-2 rounded-xl bg-[#1A4516] text-white font-black text-xs hover:bg-[#1A4516]/90 transition shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <ListPlus size={15} />
            + New List
          </button>
        </div>

        {/* Title & Description */}
        <div className="mb-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full mb-1.5">
              <Sparkles size={11} />
              Single-Store Smart Baskets
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              My Custom Grocery Lists
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Save your frequent ration & snack lists. Re-order the entire basket anytime in a single tap.
            </p>
          </div>
        </div>

        {/* Tabs: Saved Lists vs Past Orders */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("saved")}
            className={cn(
              "px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2",
              activeTab === "saved"
                ? "bg-[#1A4516] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <BookmarkCheck size={15} />
            Saved Baskets ({savedLists.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2",
              activeTab === "history"
                ? "bg-[#1A4516] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Clock size={15} />
            Past Order Baskets ({pastOrders.length})
          </button>
        </div>

        {/* Tab 1: Saved Baskets */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-16 text-xs text-slate-400 font-medium">
                Loading your saved lists...
              </div>
            ) : savedLists.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <ShoppingBag size={42} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-black text-slate-800">No Saved Baskets Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5 font-medium">
                  Create your first personalized list of groceries and reorder anytime in 1-click.
                </p>
                <button
                  onClick={() => navigate("/user/lists/create", { state: { fromLists: true } })}
                  className="px-5 py-2.5 rounded-xl bg-[#1A4516] text-white text-xs font-black hover:bg-[#1A4516]/90 transition active:scale-95 shadow-md"
                >
                  + Create First List
                </button>
              </div>
            ) : (
              savedLists.map((list) => {
                const sellerName =
                  list.sellerId?.shopName ||
                  list.sellerId?.storeName ||
                  list.sellerId?.name ||
                  "Local Store";
                return (
                  <div
                    key={list._id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {list.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Store size={13} className="text-emerald-700" />
                          <span>{sellerName}</span>
                          <span className="text-slate-300">•</span>
                          <span>{list.items?.length || 0} unique items</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/user/lists/edit/${list._id}`, { state: { fromLists: true } })}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                          title="Edit List"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteList(list._id)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                          title="Delete List"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {list.items?.map((it, idx) => {
                        const prod = it.productId;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100"
                          >
                            <img
                              src={prod?.mainImage || "/vegetable-basket-banner.png"}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200/60 shrink-0 bg-white"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {prod?.name || "Product"}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Qty: <strong>{it.quantity || 1}</strong> • ₹{Number(it.livePrice || it.unitPriceSnapshot || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer Reorder Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div className="shrink-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                          Est. Total Amount
                        </span>
                        <span className="text-base sm:text-lg font-black text-[#1A4516]">
                          ₹{Number(list.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleReorderSavedList(list)}
                        disabled={actionInProgressId === list._id}
                        className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#1A4516] text-white font-black text-xs hover:bg-[#1A4516]/90 transition active:scale-95 shadow-md flex items-center gap-2 shrink-0 whitespace-nowrap disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        {actionInProgressId === list._id ? "Loading Cart..." : "Add Entire Basket to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Past Orders as Baskets */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {pastOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <PackageCheck size={42} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-black text-slate-800">No Past Basket Orders Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
                  When you place an order from your custom grocery lists or baskets, your basket order history will appear here.
                </p>
              </div>
            ) : (
              pastOrders.map((order) => {
                const orderDate = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Recent";

                const matchedListObj = savedLists.find(
                  (sl) =>
                    sl.name === order.matchedListName ||
                    sl.name === order.listName ||
                    String(sl.sellerId?._id || sl.sellerId) === String(order.seller?._id || order.seller)
                );

                const sellerName =
                  order.seller?.shopName ||
                  order.seller?.storeName ||
                  order.seller?.name ||
                  order.sellerId?.shopName ||
                  order.sellerId?.storeName ||
                  order.sellerId?.name ||
                  order.matchedSellerName ||
                  matchedListObj?.sellerId?.shopName ||
                  matchedListObj?.sellerId?.storeName ||
                  matchedListObj?.sellerId?.name ||
                  order.items?.[0]?.product?.sellerId?.shopName ||
                  order.items?.[0]?.productId?.sellerId?.shopName ||
                  "Harshvardhan Panchal";

                const basketName =
                  order.matchedListName ||
                  order.listName ||
                  "Custom Grocery Basket";

                return (
                  <div
                    key={order._id || order.orderId}
                    className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-black uppercase text-emerald-900 bg-emerald-100 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <Sparkles size={11} className="text-emerald-700" />
                            Basket: {basketName}
                          </span>
                          <span className="text-xs font-extrabold text-slate-500">
                            Order #{String(order.orderId || order._id).slice(-6).toUpperCase()}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-400 font-semibold">{orderDate}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-bold flex items-center gap-1 mt-1">
                          <Store size={13} className="text-emerald-700" />
                          <span>{sellerName}</span>
                          <span className="text-slate-300">•</span>
                          <span>{order.items?.length || 0} items</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveOrderAsList(order)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 flex items-center gap-1"
                        >
                          <BookmarkCheck size={13} className="text-emerald-700" />
                          Save as New List
                        </button>
                      </div>
                    </div>

                    {/* Products Row */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {order.items?.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0 max-w-[200px]"
                        >
                          <img
                            src={it.image || it.product?.mainImage || it.productId?.mainImage || "/vegetable-basket-banner.png"}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200/60 bg-white shrink-0"
                          />
                          <div className="min-w-0 pr-1">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {it.name || it.product?.name || it.productName || "Product"}
                            </p>
                            <span className="text-[10px] text-slate-500 font-bold">
                              x{it.quantity || 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 flex items-center justify-between gap-4 border-t border-slate-100">
                      <div className="shrink-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                          Order Total
                        </span>
                        <span className="text-base sm:text-lg font-black text-[#1A4516]">
                          ₹{Number(order.pricing?.total || order.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleReorderPastOrder(order)}
                        disabled={actionInProgressId === order._id}
                        className="px-4 py-2 rounded-xl bg-[#1A4516] text-white font-black text-xs hover:bg-[#1A4516]/90 transition active:scale-95 shadow-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        {actionInProgressId === order._id ? "Loading..." : "Reorder Entire Basket"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* List Builder Modal */}
      {isBuilderOpen && (
        <ListBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          initialList={selectedListToEdit}
          onListSaved={() => fetchSavedLists()}
        />
      )}
    </div>
  );
};

export default MyListsPage;
