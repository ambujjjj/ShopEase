
import { useContext } from "react";
import { Navigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children, adminOnly = false }) {
  const {
    isAuthenticated,
    user,
    loading,
  } = useContext(AuthContext);

  // Wait until authentication verification finishes
  if (loading) {
    return (
      <div className="loading-message">
        Verifying authentication...
      </div>
    );
  }

  // Redirect unauthenticated users
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Restrict admin-only pages
  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
