import React, { useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@shared/layout/DashboardLayout";
import SOSListener from "../components/SOSListener";
import { useSupportUnread } from "@core/context/SupportUnreadContext";
import { setActiveRole, ROLES } from "@core/auth/activeRoleStore";
import { usePermissions } from "@core/hooks/usePermissions";
import PermissionGuard from "@core/guards/PermissionGuard";
import {
  LayoutDashboard,
  Tag,
  Box,
  Building2,
  Truck,
  Wallet,
  Banknote,
  Receipt,
  CircleDollarSign,
  Users,
  HelpCircle,
  ClipboardList,
  RotateCcw,
  Settings,
  Sparkles,
  User,
  Store,
  Gift,
  Shield,
  CreditCard,
} from "lucide-react";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const CategoryManagement = React.lazy(
  () => import("../pages/CategoryManagement"),
);
const HeaderCategories = React.lazy(
  () => import("../pages/categories/HeaderCategories"),
);
const Level2Categories = React.lazy(
  () => import("../pages/categories/Level2Categories"),
);
const SubCategories = React.lazy(
  () => import("../pages/categories/SubCategories"),
);
const CategoryHierarchy = React.lazy(
  () => import("../pages/categories/CategoryHierarchy"),
);
const ProductManagement = React.lazy(
  () => import("../pages/ProductManagement"),
);
const ActiveSellers = React.lazy(() => import("../pages/ActiveSellers"));
const PendingSellers = React.lazy(() => import("../pages/PendingSellers"));
const SellerLocations = React.lazy(() => import("../pages/SellerLocations"));
const ActiveDeliveryBoys = React.lazy(
  () => import("../pages/ActiveDeliveryBoys"),
);
const PendingDeliveryBoys = React.lazy(
  () => import("../pages/PendingDeliveryBoys"),
);
const DeliveryFunds = React.lazy(() => import("../pages/DeliveryFunds"));
const DeliveryReviewsPage = React.lazy(() => import("../pages/DeliveryReviewsPage"));
const AdminWallet = React.lazy(() => import("../pages/AdminWallet"));
const WithdrawalRequests = React.lazy(
  () => import("../pages/WithdrawalRequests"),
);
const SellerTransactions = React.lazy(
  () => import("../pages/SellerTransactions"),
);
const CashCollection = React.lazy(() => import("../pages/CashCollection"));
const CustomerManagement = React.lazy(
  () => import("../pages/CustomerManagement"),
);
const CustomerDetail = React.lazy(() => import("../pages/CustomerDetail"));
const UserManagement = React.lazy(() => import("../pages/UserManagement"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const FAQManagement = React.lazy(() => import("../pages/FAQManagement"));
const OrdersList = React.lazy(() => import("../pages/OrdersList"));
const OrderDetail = React.lazy(() => import("../pages/OrderDetail"));
const Returns = React.lazy(() => import("../pages/Returns"));
const SellerDetail = React.lazy(() => import("../pages/SellerDetail"));
const SupportTickets = React.lazy(() => import("../pages/SupportTickets"));
const ReviewModeration = React.lazy(() => import("../pages/ReviewModeration"));
const FleetTracking = React.lazy(() => import("../pages/FleetTracking"));
const CouponManagement = React.lazy(() => import("../pages/CouponManagement"));
const ContentManager = React.lazy(() => import("../pages/ContentManager"));
const HeroCategoriesPerPage = React.lazy(() => import("../pages/HeroCategoriesPerPage"));
const NotificationComposer = React.lazy(
  () => import("../pages/NotificationComposer"),
);
const OffersManagement = React.lazy(
  () => import("../pages/OffersManagement"),
);
const OfferSectionsManagement = React.lazy(
  () => import("../pages/OfferSectionsManagement"),
);

const AdminSettings = React.lazy(() => import("../pages/AdminSettings"));
const AdminProfile = React.lazy(() => import("../pages/AdminProfile"));
const BirthdayCenter = React.lazy(() => import("../pages/BirthdayCenter"));
const MilestoneCampaigns = React.lazy(() => import("../pages/marketing/MilestoneCampaigns"));
const CreateMilestoneCampaign = React.lazy(() => import("../pages/marketing/CreateMilestoneCampaign"));
const SOSHistory = React.lazy(() => import("../pages/SOSHistory"));
const AccessDenied = React.lazy(() => import("../pages/AccessDenied"));
const SubAdminManagement = React.lazy(() => import("../pages/SubAdminManagement"));
const CreateSubAdmin = React.lazy(() => import("../pages/CreateSubAdmin"));
const EditSubAdmin = React.lazy(() => import("../pages/EditSubAdmin"));

const SubscriptionPlans = React.lazy(() => import("../pages/subscriptions/SubscriptionPlans"));
const SubscriptionFeatures = React.lazy(() => import("../pages/subscriptions/SubscriptionFeatures"));
const SubscriptionOffers = React.lazy(() => import("../pages/subscriptions/SubscriptionOffers"));
const SubscribersList = React.lazy(() => import("../pages/subscriptions/SubscribersList"));

/**
 * Each navItem can optionally include a `section` key to enable
 * permission-based filtering. Items without a `section` key are always visible.
 * Items with `superAdminOnly: true` are only visible to super admins.
 */
const navItems = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    color: "indigo",
    end: true,
    section: "dashboard",
  },
  {
    label: "Categories",
    icon: Tag,
    color: "rose",
    section: "categories",
    children: [
      { label: "All Categories", path: "/admin/categories/hierarchy" },
      { label: "Header Categories", path: "/admin/categories/header" },
      { label: "Main Categories", path: "/admin/categories/level2" },
      { label: "Sub-Categories", path: "/admin/categories/sub" },
    ],
  },
  { label: "Products", path: "/admin/products", icon: Box, color: "amber", section: "products" },
  {
    label: "Marketing Tools",
    icon: Sparkles,
    color: "amber",
    section: "marketing",
    children: [
      { label: "Create Sections", path: "/admin/experience-studio" },
      { label: "Hero & categories per page", path: "/admin/hero-categories" },
      { label: "Send Notifications", path: "/admin/notifications" },
      { label: "Coupons & Promos", path: "/admin/coupons" },
      { label: "Offer Sections", path: "/admin/offer-sections" },

      { label: "Milestone Coupons", path: "/admin/marketing/milestones" },
    ],
  },
  {
    label: "Customer Support",
    icon: Receipt,
    color: "emerald",
    section: "support",
    children: [
      { label: "Help Tickets", path: "/admin/support-tickets" },
      { label: "Review Content", path: "/admin/moderation" },
    ],
  },
  {
    label: "Sellers",
    icon: Store,
    color: "blue",
    section: "sellers",
    children: [
      { label: "Active Sellers", path: "/admin/sellers/active" },
      { label: "Waiting for Review", path: "/admin/sellers/pending" },
      { label: "Seller Locations", path: "/admin/seller-locations" },
    ],
  },
  {
    label: "Delivery Drivers",
    icon: Truck,
    color: "emerald",
    section: "delivery",
    children: [
      { label: "Active Drivers", path: "/admin/delivery-boys/active" },
      { label: "Waiting for Review", path: "/admin/delivery-boys/pending" },
      { label: "Track Drivers", path: "/admin/tracking" },
      { label: "Send Money", path: "/admin/delivery-funds" },
      { label: "Delivery Reviews", path: "/admin/delivery-reviews" },
      { label: "SOS History", path: "/admin/sos-history" },
    ],
  },
  { label: "Wallet", path: "/admin/wallet", icon: Wallet, color: "violet", section: "wallet" },
  {
    label: "Money Requests",
    path: "/admin/withdrawals",
    icon: Banknote,
    color: "cyan",
    section: "withdrawals",
  },
  {
    label: "Seller Payments",
    path: "/admin/seller-transactions",
    icon: Receipt,
    color: "orange",
    section: "seller_transactions",
  },
  {
    label: "Collect Cash",
    path: "/admin/cash-collection",
    icon: CircleDollarSign,
    color: "green",
    section: "cash_collection",
  },
  {
    label: "Customers",
    icon: Users,
    color: "sky",
    section: "customers",
    children: [
      { label: "All Customers", path: "/admin/customers" },
      { label: "Birthday Center", path: "/admin/birthdays" },
    ],
  },
  {
    label: "Subscriptions",
    icon: CreditCard,
    color: "violet",
    section: "subscriptions",
    children: [
      { label: "Subscribers", path: "/admin/subscriptions/subscribers" },
      { label: "Plans", path: "/admin/subscriptions/plans" },
      { label: "Features", path: "/admin/subscriptions/features" },
      { label: "Offers & Discounts", path: "/admin/subscriptions/offers" },
    ],
  },
  { label: "FAQs", path: "/admin/faqs", icon: HelpCircle, color: "pink", section: "faqs" },
  {
    label: "Orders",
    icon: ClipboardList,
    color: "fuchsia",
    section: "orders",
    children: [
      { label: "All Orders", path: "/admin/orders/all" },
      { label: "New Orders", path: "/admin/orders/pending" },
      { label: "Being Prepared", path: "/admin/orders/processed" },
      { label: "On the Way", path: "/admin/orders/out-for-delivery" },
      { label: "Delivered", path: "/admin/orders/delivered" },
      { label: "Cancelled", path: "/admin/orders/cancelled" },
      { label: "Returned", path: "/admin/orders/returned" },
      { label: "Return Requests", path: "/admin/returns" },
    ],
  },
  {
    label: "Fees & Charges",
    path: "/admin/billing",
    icon: RotateCcw,
    color: "red",
    section: "billing",
  },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: Settings,
    color: "slate",
    section: "settings",
  },
  {
    label: "Sub Admins",
    path: "/admin/sub-admins",
    icon: Shield,
    color: "indigo",
    superAdminOnly: true,
  },
  { label: "My Profile", path: "/admin/profile", icon: User, color: "indigo" },
];

const BillingCharges = React.lazy(() => import("../pages/BillingCharges"));

const AdminRoutes = () => {
  useEffect(() => {
    setActiveRole(ROLES.ADMIN);
  }, []);

  const { totalUnread } = useSupportUnread();
  const { hasPermission, isSuperAdmin } = usePermissions();

  // Filter nav items based on permissions
  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => {
      // Items without a section key are always visible (e.g. My Profile)
      if (!item.section && !item.superAdminOnly) return true;

      // Super admin only items
      if (item.superAdminOnly) return isSuperAdmin();

      // Section-based permission check
      if (item.section) return hasPermission(item.section, "view");

      return true;
    });
  }, [hasPermission, isSuperAdmin]);

  const navItemsWithBadges = useMemo(() => {
    const count = Number.isFinite(totalUnread) ? totalUnread : 0;
    if (count <= 0) return filteredNavItems;
    return filteredNavItems.map((item) => {
      if (item?.label !== "Customer Support") return item;
      return { ...item, badgeCount: count };
    });
  }, [totalUnread, filteredNavItems]);

  return (
    <DashboardLayout navItems={navItemsWithBadges} title="Admin Center">
      <SOSListener />
      <Routes>
        {/* Always accessible: dashboard (landing page for all admins) */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={
          <PermissionGuard section="customers" action="view" fallback={AccessDenied}>
            <UserManagement />
          </PermissionGuard>
        } />
        <Route path="/profile" element={<AdminProfile />} />

        {/* Categories */}
        <Route
          path="/categories"
          element={<Navigate to="/admin/categories/header" replace />}
        />
        <Route path="/categories/header" element={
          <PermissionGuard section="categories" action="view" fallback={AccessDenied}>
            <HeaderCategories />
          </PermissionGuard>
        } />
        <Route path="/categories/level2" element={
          <PermissionGuard section="categories" action="view" fallback={AccessDenied}>
            <Level2Categories />
          </PermissionGuard>
        } />
        <Route path="/categories/sub" element={
          <PermissionGuard section="categories" action="view" fallback={AccessDenied}>
            <SubCategories />
          </PermissionGuard>
        } />
        <Route path="/categories/hierarchy" element={
          <PermissionGuard section="categories" action="view" fallback={AccessDenied}>
            <CategoryHierarchy />
          </PermissionGuard>
        } />

        {/* Products */}
        <Route path="/products" element={
          <PermissionGuard section="products" action="view" fallback={AccessDenied}>
            <ProductManagement />
          </PermissionGuard>
        } />

        {/* Sellers */}
        <Route path="/sellers/active" element={
          <PermissionGuard section="sellers" action="view" fallback={AccessDenied}>
            <ActiveSellers />
          </PermissionGuard>
        } />
        <Route path="/sellers/active/:id" element={
          <PermissionGuard section="sellers" action="view" fallback={AccessDenied}>
            <SellerDetail />
          </PermissionGuard>
        } />
        <Route path="/sellers/pending" element={
          <PermissionGuard section="sellers" action="view" fallback={AccessDenied}>
            <PendingSellers />
          </PermissionGuard>
        } />
        <Route path="/seller-locations" element={
          <PermissionGuard section="sellers" action="view" fallback={AccessDenied}>
            <SellerLocations />
          </PermissionGuard>
        } />

        {/* Support */}
        <Route path="/support-tickets" element={
          <PermissionGuard section="support" action="view" fallback={AccessDenied}>
            <SupportTickets />
          </PermissionGuard>
        } />
        <Route path="/sos-history" element={
          <PermissionGuard section="delivery" action="view" fallback={AccessDenied}>
            <SOSHistory />
          </PermissionGuard>
        } />
        <Route path="/moderation" element={
          <PermissionGuard section="support" action="view" fallback={AccessDenied}>
            <ReviewModeration />
          </PermissionGuard>
        } />

        {/* Marketing */}
        <Route path="/experience-studio" element={
          <PermissionGuard section="marketing" action="view" fallback={AccessDenied}>
            <ContentManager />
          </PermissionGuard>
        } />
        <Route path="/hero-categories" element={
          <PermissionGuard section="marketing" action="view" fallback={AccessDenied}>
            <HeroCategoriesPerPage />
          </PermissionGuard>
        } />
        <Route path="/notifications" element={
          <PermissionGuard section="marketing" action="view" fallback={AccessDenied}>
            <NotificationComposer />
          </PermissionGuard>
        } />
        <Route path="/offers" element={
          <PermissionGuard section="marketing" action="view" fallback={AccessDenied}>
            <OffersManagement />
          </PermissionGuard>
        } />
        <Route path="/offer-sections" element={
          <PermissionGuard section="marketing" action="view" fallback={AccessDenied}>
            <OfferSectionsManagement />
          </PermissionGuard>
        } />
        <Route path="/coupons" element={
          <PermissionGuard section="marketing" action="view" fallback={AccessDenied}>
            <CouponManagement />
          </PermissionGuard>
        } />
        <Route path="/marketing/milestones" element={
          <PermissionGuard section="marketing" action="view" fallback={AccessDenied}>
            <MilestoneCampaigns />
          </PermissionGuard>
        } />
        <Route path="/marketing/milestones/create" element={
          <PermissionGuard section="marketing" action="create" fallback={AccessDenied}>
            <CreateMilestoneCampaign />
          </PermissionGuard>
        } />

        {/* Delivery */}
        <Route path="/delivery-boys/active" element={
          <PermissionGuard section="delivery" action="view" fallback={AccessDenied}>
            <ActiveDeliveryBoys />
          </PermissionGuard>
        } />
        <Route path="/delivery-boys/pending" element={
          <PermissionGuard section="delivery" action="view" fallback={AccessDenied}>
            <PendingDeliveryBoys />
          </PermissionGuard>
        } />
        <Route path="/tracking" element={
          <PermissionGuard section="delivery" action="view" fallback={AccessDenied}>
            <FleetTracking />
          </PermissionGuard>
        } />
        <Route path="/delivery-funds" element={
          <PermissionGuard section="delivery" action="view" fallback={AccessDenied}>
            <DeliveryFunds />
          </PermissionGuard>
        } />
        <Route path="/delivery-reviews" element={
          <PermissionGuard section="delivery" action="view" fallback={AccessDenied}>
            <DeliveryReviewsPage />
          </PermissionGuard>
        } />

        {/* Finance */}
        <Route path="/wallet" element={
          <PermissionGuard section="wallet" action="view" fallback={AccessDenied}>
            <AdminWallet />
          </PermissionGuard>
        } />
        <Route path="/withdrawals" element={
          <PermissionGuard section="withdrawals" action="view" fallback={AccessDenied}>
            <WithdrawalRequests />
          </PermissionGuard>
        } />
        <Route path="/seller-transactions" element={
          <PermissionGuard section="seller_transactions" action="view" fallback={AccessDenied}>
            <SellerTransactions />
          </PermissionGuard>
        } />
        <Route path="/cash-collection" element={
          <PermissionGuard section="cash_collection" action="view" fallback={AccessDenied}>
            <CashCollection />
          </PermissionGuard>
        } />

        {/* Customers */}
        <Route path="/customers" element={
          <PermissionGuard section="customers" action="view" fallback={AccessDenied}>
            <CustomerManagement />
          </PermissionGuard>
        } />
        <Route path="/customers/:id" element={
          <PermissionGuard section="customers" action="view" fallback={AccessDenied}>
            <CustomerDetail />
          </PermissionGuard>
        } />
        <Route path="/birthdays" element={
          <PermissionGuard section="customers" action="view" fallback={AccessDenied}>
            <BirthdayCenter />
          </PermissionGuard>
        } />

        {/* Subscriptions */}
        <Route path="/subscriptions/subscribers" element={
          <PermissionGuard section="subscriptions" action="view" fallback={AccessDenied}>
            <SubscribersList />
          </PermissionGuard>
        } />
        <Route path="/subscriptions/plans" element={
          <PermissionGuard section="subscriptions" action="view" fallback={AccessDenied}>
            <SubscriptionPlans />
          </PermissionGuard>
        } />
        <Route path="/subscriptions/features" element={
          <PermissionGuard section="subscriptions" action="view" fallback={AccessDenied}>
            <SubscriptionFeatures />
          </PermissionGuard>
        } />
        <Route path="/subscriptions/offers" element={
          <PermissionGuard section="subscriptions" action="view" fallback={AccessDenied}>
            <SubscriptionOffers />
          </PermissionGuard>
        } />

        {/* Other */}
        <Route path="/faqs" element={
          <PermissionGuard section="faqs" action="view" fallback={AccessDenied}>
            <FAQManagement />
          </PermissionGuard>
        } />
        <Route path="/orders/:status" element={
          <PermissionGuard section="orders" action="view" fallback={AccessDenied}>
            <OrdersList />
          </PermissionGuard>
        } />
        <Route path="/orders/view/:orderId" element={
          <PermissionGuard section="orders" action="view" fallback={AccessDenied}>
            <OrderDetail />
          </PermissionGuard>
        } />
        <Route path="/returns" element={
          <PermissionGuard section="orders" action="view" fallback={AccessDenied}>
            <Returns />
          </PermissionGuard>
        } />
        <Route path="/billing" element={
          <PermissionGuard section="billing" action="view" fallback={AccessDenied}>
            <BillingCharges />
          </PermissionGuard>
        } />
        <Route path="/settings" element={
          <PermissionGuard section="settings" action="view" fallback={AccessDenied}>
            <AdminSettings />
          </PermissionGuard>
        } />

        {/* Sub Admin Management (Super Admin only) */}
        <Route path="/sub-admins" element={
          <PermissionGuard superAdminOnly fallback={AccessDenied}>
            <SubAdminManagement />
          </PermissionGuard>
        } />
        <Route path="/sub-admins/create" element={
          <PermissionGuard superAdminOnly fallback={AccessDenied}>
            <CreateSubAdmin />
          </PermissionGuard>
        } />
        <Route path="/sub-admins/:id/edit" element={
          <PermissionGuard superAdminOnly fallback={AccessDenied}>
            <EditSubAdmin />
          </PermissionGuard>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminRoutes;
