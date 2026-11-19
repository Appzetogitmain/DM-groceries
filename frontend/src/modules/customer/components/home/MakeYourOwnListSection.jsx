import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ListPlus,
  Sparkles,
  ShoppingBag,
  Store,
  ArrowRight,
  RotateCcw,
  Plus,
  ChevronRight,
} from "lucide-react";
import { customerApi } from "../../services/customerApi";
import { useCart } from "../../context/CartContext";
import { useAuth } from "@core/context/AuthContext";
import { toast } from "sonner";
import ListBuilderModal from "../list/ListBuilderModal";

const INSPIRATION_TEMPLATES = [
  {
    name: "Monthly Pantry Ration",
    tag: "Aata, Rice, Dal & Oil",
    itemsCount: "8-12 items",
    bg: "from-amber-500/10 to-orange-500/10 border-amber-200/80",
    badgeColor: "bg-amber-100 text-amber-900",
  },
  {
    name: "Daily Dairy & Breakfast",
    tag: "Milk, Bread, Butter & Eggs",
    itemsCount: "4-6 items",
    bg: "from-emerald-500/10 to-teal-500/10 border-emerald-200/80",
    badgeColor: "bg-emerald-100 text-emerald-900",
  },
  {
    name: "Fresh Kitchen Veggies",
    tag: "Onion, Potato, Tomato & Herbs",
    itemsCount: "6-8 items",
    bg: "from-green-500/10 to-lime-500/10 border-green-200/80",
    badgeColor: "bg-green-100 text-green-900",
  },
];

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

  const handleOpenBuilderWithTemplate = (templateName) => {
    navigate(`/user/lists/create?template=${encodeURIComponent(templateName)}`);
  };

  return (
    <section className="container mx-auto px-4 md:px-8 lg:px-[50px] py-4 mb-4">
      {/* Main Section Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#12330F] via-[#1A4516] to-[#0E280C] p-6 sm:p-8 text-white shadow-xl overflow-hidden">
        {/* Glow & Backdrop Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
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

        {/* Popular Basket Ideas — Always displayed as inspiration presets */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200 block mb-3 px-1">
            Popular Basket Ideas — Tap to Customize
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INSPIRATION_TEMPLATES.map((tmpl, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenBuilderWithTemplate(tmpl.name)}
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 transition cursor-pointer active:scale-95 flex flex-col justify-between gap-3 text-left group"
              >
                <div>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mb-2 ${tmpl.badgeColor}`}
                  >
                    {tmpl.itemsCount}
                  </span>
                  <h4 className="font-bold text-sm text-white group-hover:text-emerald-200 transition">
                    {tmpl.name}
                  </h4>
                  <p className="text-[11px] text-emerald-100/70 mt-1 font-medium">
                    {tmpl.tag}
                  </p>
                </div>

                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Start this list <ArrowRight size={12} />
                </span>
              </div>
            ))}
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
