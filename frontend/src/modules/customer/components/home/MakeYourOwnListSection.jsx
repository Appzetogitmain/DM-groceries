import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ListPlus,
  Sparkles,
  ShoppingBag,
  Store,
  RotateCcw,
  Plus,
  ChevronRight,
} from "lucide-react";
import { customerApi } from "../../services/customerApi";
import { useCart } from "../../context/CartContext";
import { useAuth } from "@core/context/AuthContext";
import { toast } from "sonner";
import ListBuilderModal from "../list/ListBuilderModal";

const MakeYourOwnListSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addCustomListToCart } = useCart();

  const [savedLists, setSavedLists] = useState([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedListToEdit, setSelectedListToEdit] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);

  const fetchLists = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await customerApi.getCustomerLists({ status: "active" });
      if (res.data?.success) {
        setSavedLists(res.data.result || []);
      }
    } catch (e) {
      // Non-critical
    }
  };

  useEffect(() => {
    fetchLists();
  }, [isAuthenticated]);

  const handleQuickReorder = async (e, list) => {
    e.stopPropagation();
    setReorderingId(list._id);
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
        toast.success(`Loaded "${list.name}" (${list.items?.length || 0} items) to your cart!`);
        navigate("/user/checkout");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load list into cart");
    } finally {
      setTimeout(() => setReorderingId(null), 600);
    }
  };

  return (
    <section className="container mx-auto px-4 md:px-8 lg:px-[50px] py-4 mb-4">
      {/* Main Section Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#12330F] via-[#1A4516] to-[#0E280C] p-6 sm:p-8 text-white shadow-xl overflow-hidden">
        {/* Glow & Backdrop Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-xs mb-3">
              <Sparkles size={12} />
              Personalized Grocery Baskets
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Make Your Own Grocery List
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-2 font-medium leading-relaxed">
              Assemble monthly essentials from your favorite local store once. Re-order the entire basket anytime in 1-click!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                navigate("/user/lists/create");
              }}
              className="px-5 py-3 rounded-2xl bg-white text-[#1A4516] font-black text-xs uppercase tracking-wider hover:bg-emerald-50 transition active:scale-95 shadow-md flex items-center gap-2"
            >
              <ListPlus size={16} />
              + Create My List
            </button>
            {isAuthenticated && (
              <Link
                to="/user/lists"
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1.5"
              >
                My Lists <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* List Builder Modal */}
      {isBuilderOpen && (
        <ListBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          initialList={selectedListToEdit}
          onListSaved={() => fetchLists()}
        />
      )}
    </section>
  );
};

export default MakeYourOwnListSection;
