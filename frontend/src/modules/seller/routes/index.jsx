import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import DashboardLayout from "@shared/layout/DashboardLayout";
import { setActiveRole, ROLES } from "@core/auth/activeRoleStore";
import Orders from "../pages/Orders";
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
} from "react-icons/hi2";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const ProductManagement = React.lazy(
  () => import("../pages/ProductManagement"),
);
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

const navItems = [
  { label: "Dashboard", path: "/seller", icon: HiOutlineSquares2X2, end: true },
  { label: "Products", path: "/seller/products", icon: HiOutlineCube },
  { label: "Stock", path: "/seller/inventory", icon: HiOutlineArchiveBox },
  { label: "Orders", path: "/seller/orders", icon: HiOutlineTruck },
  { label: "Returns", path: "/seller/returns", icon: HiOutlineArchiveBox },
  { label: "Track Orders", path: "/seller/tracking", icon: HiOutlineMapPin },
  {
    label: "Sales Reports",
    path: "/seller/analytics",
    icon: HiOutlineChartBarSquare,
  },
  {
    label: "Money Request",
    path: "/seller/withdrawals",
    icon: HiOutlineCurrencyDollar,
  },
  {
    label: "Payment History",
    path: "/seller/transactions",
    icon: HiOutlineCreditCard,
  },
  {
    label: "Earnings",
    path: "/seller/earnings",
    icon: HiOutlineCurrencyDollar,
  },
  { label: "POS Billing", path: "/seller/pos", icon: HiOutlineComputerDesktop },
  { label: "POS History", path: "/seller/pos-history", icon: HiOutlineComputerDesktop },
  { label: "Profile", path: "/seller/profile", icon: HiOutlineUser },
];

const SellerRoutes = () => {
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
    <DashboardLayout navItems={navItems} title="Seller Panel">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/products/add" element={<AddProduct />} />
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
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default SellerRoutes;
