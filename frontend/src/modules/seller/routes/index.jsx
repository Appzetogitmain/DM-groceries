import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import DashboardLayout from "@shared/layout/DashboardLayout";
import { setActiveRole, ROLES } from "@core/auth/activeRoleStore";
import Orders from "../pages/Orders";
import { useTranslation } from "react-i18next";
import SellerLanguageProvider from "../i18n/SellerLanguageProvider";
import {
  HiOutlineSquares2X2,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineUser,
  HiOutlineTruck,
  HiOutlineArchiveBox,
  HiOutlineChartBarSquare,
  HiOutlineCreditCard,
  HiOutlineMapPin,
  HiOutlineComputerDesktop,
  HiOutlineRectangleStack,
} from "react-icons/hi2";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const ProductManagement = React.lazy(
  () => import("../pages/ProductManagement"),
);
const Packages = React.lazy(() => import("../pages/Packages"));
const StockManagement = React.lazy(() => import("../pages/StockManagement"));
const AddProduct = React.lazy(() => import("../pages/AddProduct"));
// Note: Orders is imported eagerly above to avoid dynamic import issues
const Returns = React.lazy(() => import("../pages/Returns"));
const Earnings = React.lazy(() => import("../pages/Earnings"));
const Analytics = React.lazy(() => import("../pages/Analytics"));
const Transactions = React.lazy(() => import("../pages/Transactions"));
const DeliveryTracking = React.lazy(() => import("../pages/DeliveryTracking"));
const Profile = React.lazy(() => import("../pages/Profile"));
const Withdrawals = React.lazy(() => import("../pages/Withdrawals"));
const POS = React.lazy(() => import("../pages/POS"));
const PosSalesHistory = React.lazy(() => import("../pages/PosSalesHistory"));
const SupportPage = React.lazy(() => import("../pages/SupportPage"));
const PrivacyPage = React.lazy(() => import("../pages/PrivacyPage"));
// [SUBSCRIPTION DISABLED] const Subscription = React.lazy(() => import("../pages/Subscription"));

const navItems = [
  { labelKey: "nav.dashboard", path: "/seller", icon: HiOutlineSquares2X2, end: true },
  { labelKey: "nav.products", path: "/seller/products", icon: HiOutlineCube },
  { labelKey: "nav.packages", path: "/seller/packages", icon: HiOutlineRectangleStack },
  { labelKey: "nav.stock", path: "/seller/inventory", icon: HiOutlineArchiveBox },
  { labelKey: "nav.orders", path: "/seller/orders", icon: HiOutlineTruck },
  { labelKey: "nav.returns", path: "/seller/returns", icon: HiOutlineArchiveBox },
  { labelKey: "nav.trackOrders", path: "/seller/tracking", icon: HiOutlineMapPin },
  {
    labelKey: "nav.salesReports",
    path: "/seller/analytics",
    icon: HiOutlineChartBarSquare,
  },
  {
    labelKey: "nav.moneyRequest",
    path: "/seller/withdrawals",
    icon: HiOutlineCurrencyDollar,
  },
  {
    labelKey: "nav.paymentHistory",
    path: "/seller/transactions",
    icon: HiOutlineCreditCard,
  },
  {
    labelKey: "nav.earnings",
    path: "/seller/earnings",
    icon: HiOutlineCurrencyDollar,
  },
  { labelKey: "nav.posBilling", path: "/seller/pos", icon: HiOutlineComputerDesktop },
  { labelKey: "nav.posHistory", path: "/seller/pos-history", icon: HiOutlineComputerDesktop },
  // [SUBSCRIPTION DISABLED] { labelKey: "nav.subscription", path: "/seller/subscription", icon: HiOutlineCreditCard },
  { labelKey: "nav.profile", path: "/seller/profile", icon: HiOutlineUser },
];

const SellerRoutesInner = () => {
  const { t } = useTranslation();
  const translatedNavItems = navItems.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }));
  useEffect(() => {
    setActiveRole(ROLES.SELLER);
  }, []);

  const location = useLocation();
  const isPublicPage = location.pathname === '/seller/support' || location.pathname === '/seller/privacy';

  if (isPublicPage) {
    return (
      <Routes>
        <Route path="/support" element={<SupportPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    );
  }

  return (
    <DashboardLayout navItems={translatedNavItems} title={t("nav.panelTitle")}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/products/add" element={<AddProduct />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/inventory" element={<StockManagement />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/tracking" element={<DeliveryTracking />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/pos-history" element={<PosSalesHistory />} />
        {/* [SUBSCRIPTION DISABLED] <Route path="/subscription" element={<Subscription />} /> */}
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

const SellerRoutes = () => (
  <SellerLanguageProvider>
    <SellerRoutesInner />
  </SellerLanguageProvider>
);

export default SellerRoutes;
