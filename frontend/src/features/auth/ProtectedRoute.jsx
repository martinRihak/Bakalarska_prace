import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import useApi from "@/hooks/useApi";
import api from "@/api/apiService";

const ProtectedRoute = ({ children }) => {
  const [authState, setAuthState] = useState("loading"); // "loading" | "authenticated" | "unauthenticated" | "server-error"
  const { callApi } = useApi();

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setAuthState("unauthenticated");
        return;
      }

      try {
        const data = await callApi(() => api.checkAuthStatus());
        if (cancelled) return;

        if (data?.status === "authenticated") {
          setAuthState("authenticated");
        } else {
          setAuthState("unauthenticated");
        }
      } catch {
        if (!cancelled) {
          setAuthState("server-error");
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [callApi]);

  if (authState === "loading") {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Načítání...</div>
      </div>
    );
  }

  if (authState === "server-error") {
    return <Navigate to="/server-error" replace />;
  }

  if (authState === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;