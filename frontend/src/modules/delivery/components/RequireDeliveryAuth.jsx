import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@core/context/AuthContext";

/**
 * Route guard: sends logged-out riders to the delivery login page.
 * The attempted path is passed in router state so login can return there.
 */
const RequireDeliveryAuth = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/delivery/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default RequireDeliveryAuth;
