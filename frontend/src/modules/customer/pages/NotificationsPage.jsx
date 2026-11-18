import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, BellRing, Check } from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { notificationImageUrl } from "@/lib/utils";

const LIST_REMINDER_TYPE = "CUSTOMER_LIST_REMINDER";

const formatReminderTime = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
};

const NotificationsPage = () => {
    const navigate = useNavigate();
    const { addCustomListToCart } = useCart();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markingRead, setMarkingRead] = useState(false);
    // listId currently being acted on, and lists snoozed during this visit
    const [reminderActionId, setReminderActionId] = useState(null);
    const [snoozedListIds, setSnoozedListIds] = useState(() => new Set());

    const handleReorderList = async (listId) => {
        if (!listId || reminderActionId) return;
        setReminderActionId(listId);
        try {
            const res = await customerApi.getCustomerListById(listId);
            const list = res.data?.result;
            if (!list || !Array.isArray(list.items) || list.items.length === 0) {
                toast.error("This list is no longer available");
                return;
            }
            try {
                localStorage.setItem(
                    "DM_ACTIVE_LIST_ORDER",
                    JSON.stringify({
                        listId: list._id,
                        listName: list.name || "Custom Grocery Basket",
                        items: list.items
                            .map((it) => String(it.productId?._id || it.productId || ""))
                            .filter(Boolean),
                    })
                );
            } catch (e) {}

            const added = await addCustomListToCart(list);
            if (added) {
                toast.success(`Loaded "${list.name}" into your cart!`);
                navigate("/user/checkout");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load list into cart");
        } finally {
            setReminderActionId(null);
        }
    };

    const handleRemindLater = async (listId) => {
        if (!listId || reminderActionId) return;
        setReminderActionId(listId);
        try {
            await customerApi.snoozeCustomerListReminder(listId, { hours: 24 });
            setSnoozedListIds((prev) => new Set(prev).add(String(listId)));
            toast.success("Okay, we'll remind you tomorrow");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to snooze reminder");
        } finally {
            setReminderActionId(null);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await customerApi.getNotifications();
            const fetchedNotifications = response.data?.result?.notifications || response.data?.data?.notifications || [];
            setNotifications(fetchedNotifications);
            
            // Auto mark as read if there are unread ones
            if (fetchedNotifications.some(n => !n.isRead)) {
                markAllAsRead();
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            setMarkingRead(true);
            await customerApi.markNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Error marking notifications as read:", error);
        } finally {
            setMarkingRead(false);
        }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-['Outfit',_sans-serif]">
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-slate-200/60 mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/70 rounded-full transition-colors -ml-1">
                        <ChevronLeft size={22} className="text-slate-800" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                            Notifications
                        </h1>
                        <p className="text-xs text-slate-500">
                            {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-3 max-w-2xl mx-auto">
                {notifications.length > 0 ? (
                    notifications.map((notification) => {
                        if (notification.type === LIST_REMINDER_TYPE && notification.data?.listId) {
                            const listId = String(notification.data.listId);
                            const isBusy = reminderActionId === listId;
                            const isSnoozed = snoozedListIds.has(listId);
                            return (
                                <div
                                    key={notification.id}
                                    className="p-4 rounded-3xl border-2 border-[#1A4516]/25 bg-white shadow-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#1A4516] px-2.5 py-1 rounded-full">
                                            My List
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {formatReminderTime(notification.createdAt)}
                                        </span>
                                    </div>
                                    <h3 className="mt-2.5 text-lg font-black text-slate-900 leading-snug">
                                        {notification.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {notification.message || notification.body}
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleReorderList(listId)}
                                            disabled={isBusy}
                                            className="py-3 rounded-2xl bg-[#1A4516] text-white font-black text-sm hover:bg-[#1A4516]/90 transition active:scale-95 disabled:opacity-60"
                                        >
                                            {isBusy ? "Please wait..." : "Reorder now"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemindLater(listId)}
                                            disabled={isBusy || isSnoozed}
                                            className="py-3 rounded-2xl border-2 border-[#1A4516] text-[#1A4516] font-black text-sm hover:bg-emerald-50 transition active:scale-95 disabled:opacity-60"
                                        >
                                            {isSnoozed ? "Reminder set" : "Remind later"}
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        const imageUrl = notificationImageUrl(notification);
                        return (
                        <div 
                            key={notification.id} 
                            className={`p-4 rounded-2xl border flex gap-4 ${
                                notification.isRead 
                                ? "bg-white border-slate-100" 
                                : "bg-primary/5 border-primary/20"
                            }`}
                        >
                            <div className={`mt-1 h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${
                                notification.isRead ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary"
                            }`}>
                                {notification.isRead ? <Bell size={18} /> : <BellRing size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className={`font-semibold ${notification.isRead ? "text-slate-700" : "text-slate-900"}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap pt-1">
                                        {timeAgo(notification.createdAt)}
                                    </span>
                                </div>
                                <p className={`mt-1 text-sm ${notification.isRead ? "text-slate-500" : "text-slate-700"}`}>
                                    {notification.message || notification.body}
                                </p>
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt=""
                                        className="mt-3 w-full max-h-40 rounded-xl object-cover"
                                        loading="lazy"
                                    />
                                ) : null}
                            </div>
                        </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Bell className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No notifications yet</h3>
                        <p className="text-slate-500 text-sm max-w-[250px]">
                            When you get notifications about orders or promotions, they'll show up here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
