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
import { useTranslation } from "react-i18next";
import { useCart } from "../../context/CartContext";
import { useAuth } from "@core/context/AuthContext";
import { toast } from "sonner";
import ListBuilderModal from "../list/ListBuilderModal";

const MakeYourOwnListSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
            listName: list.name || t("lists.defaultBasketName"),
            items: (list.items || [])
              .map((it) => String(it.productId?._id || it.productId || ""))
              .filter(Boolean),
          })
        );
      } catch (e) {}

      const added = await addCustomListToCart(list);
      if (added) {
        toast.success(t("lists.loadedIntoCartWithCount", { name: list.name, count: list.items?.length || 0 }));
        navigate("/user/checkout");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t("lists.loadIntoCartFailed"));
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
              {t("home.myList.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              {t("home.myList.title")}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-2 font-medium leading-relaxed">
              {t("home.myList.body")}
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
              + {t("home.myList.create")}
            </button>
            {isAuthenticated && (
              <Link
                to="/user/lists"
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1.5"
              >
                {t("home.myList.myLists")} <ChevronRight size={14} />
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
