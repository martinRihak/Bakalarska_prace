import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import useApi from "@/hooks/useApi";
import api from '@/api/apiService';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("token") !== null;
  const [isServerAvailable, setIsServerAvailable] = useState(null);
  const { callApi } = useApi();

  useEffect(() => {
    const checkServer = async () => {
      try {
        await callApi(() => api.get("/auth/status"));
        setIsServerAvailable(true);
      } catch (error) {
        setIsServerAvailable(false);
      }
    };
    checkServer();
  }, [callApi]);
  if (isServerAvailable === null) {
    return <div>Loading...</div>;
  }
  if (!isServerAvailable) {
    return <Navigate to="/server-error" replace />;
  }
  if (!isAuthenticated && isServerAvailable) {
    // Redirect them to the login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;