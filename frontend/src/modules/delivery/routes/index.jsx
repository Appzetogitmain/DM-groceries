import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DeliveryLayout from "../layout/DeliveryLayout";
import DeliveryLanguageProvider from "../i18n/DeliveryLanguageProvider";
import { setActiveRole, ROLES } from "@core/auth/activeRoleStore";
import Splash from "../pages/Splash";
import DeliveryAuth from "../pages/DeliveryAuth";
import Dashboard from "../pages/Dashboard";
import OrderDetails from "../pages/OrderDetails";
import Navigation from "../pages/Navigation";
import DeliveryConfirmation from "../pages/DeliveryConfirmation";
import EarningsPage from "../pages/EarningsPage";
import CodCash from "../pages/CodCash";
import OrderHistory from "../pages/OrderHistory";
import Profile from "../pages/Profile";
import PersonalDetails from "../pages/profile/PersonalDetails";
import VehicleInfo from "../pages/profile/VehicleInfo";
import BankAccount from "../pages/profile/BankAccount";
import Documents from "../pages/profile/Documents";
import SafetyPrivacy from "../pages/profile/SafetyPrivacy";
import HelpSupport from "../pages/profile/HelpSupport";
import ChatSupport from "../pages/profile/ChatSupport";
import Withdrawals from "../pages/profile/Withdrawals";
import Notifications from "../pages/Notifications";
import ReviewsPage from "../pages/ReviewsPage";
import SupportPage from "../pages/SupportPage";
import PrivacyPage from "../pages/PrivacyPage";
import RequireDeliveryAuth from "../components/RequireDeliveryAuth";

const DeliveryRoutes = () => {
  useEffect(() => {
    setActiveRole(ROLES.DELIVERY);
  }, []);

  return (
    <DeliveryLanguageProvider>
    <Routes>
      <Route element={<DeliveryLayout />}>
        <Route path="splash" element={<Splash />} />

        <Route path="auth" element={<DeliveryAuth />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="order-details/:orderId" element={<RequireDeliveryAuth><OrderDetails /></RequireDeliveryAuth>} />
        <Route path="navigation" element={<RequireDeliveryAuth><Navigation /></RequireDeliveryAuth>} />
        <Route path="confirm-delivery/:orderId" element={<RequireDeliveryAuth><DeliveryConfirmation /></RequireDeliveryAuth>} />
        <Route path="earnings" element={<RequireDeliveryAuth><EarningsPage /></RequireDeliveryAuth>} />
        <Route path="cod-cash" element={<RequireDeliveryAuth><CodCash /></RequireDeliveryAuth>} />
        <Route path="history" element={<RequireDeliveryAuth><OrderHistory /></RequireDeliveryAuth>} />
        <Route path="profile" element={<RequireDeliveryAuth><Profile /></RequireDeliveryAuth>} />
        <Route path="profile/personal-details" element={<RequireDeliveryAuth><PersonalDetails /></RequireDeliveryAuth>} />
        <Route path="profile/vehicle-info" element={<RequireDeliveryAuth><VehicleInfo /></RequireDeliveryAuth>} />
        <Route path="profile/bank-account" element={<RequireDeliveryAuth><BankAccount /></RequireDeliveryAuth>} />
        <Route path="profile/documents" element={<RequireDeliveryAuth><Documents /></RequireDeliveryAuth>} />
        <Route path="profile/safety-privacy" element={<RequireDeliveryAuth><SafetyPrivacy /></RequireDeliveryAuth>} />
        <Route path="profile/help-support" element={<RequireDeliveryAuth><HelpSupport /></RequireDeliveryAuth>} />
        <Route path="profile/chat-support" element={<RequireDeliveryAuth><ChatSupport /></RequireDeliveryAuth>} />
        <Route path="profile/withdrawals" element={<RequireDeliveryAuth><Withdrawals /></RequireDeliveryAuth>} />
        <Route path="notifications" element={<RequireDeliveryAuth><Notifications /></RequireDeliveryAuth>} />
        <Route path="reviews" element={<RequireDeliveryAuth><ReviewsPage /></RequireDeliveryAuth>} />
        <Route path="support" element={<SupportPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="/" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
    </DeliveryLanguageProvider>
  );
};

export default DeliveryRoutes;
