import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import api from "@/api/apiService";
import "./ModbusStatusBanner.css";

const ModbusStatusBanner = ({ onVisibilityChange }) => {
  const [status, setStatus] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionError, setActionError] = useState("");

  const isVisible = Boolean(status && status.connected === false);

  useEffect(() => {
    const handleModbusStatusChange = (event) => {
      if (!localStorage.getItem("token")) {
        setStatus(null);
        return;
      }

      const nextStatus = event.detail;
      setStatus(nextStatus);
      if (nextStatus?.connected) {
        setActionError("");
      }
    };

    window.addEventListener("modbus-status-change", handleModbusStatusChange);

    return () => {
      window.removeEventListener(
        "modbus-status-change",
        handleModbusStatusChange,
      );
      onVisibilityChange?.(false);
    };
  }, [onVisibilityChange]);

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  const handleReconnect = async () => {
    setIsRetrying(true);
    setActionError("");

    try {
      const response = await api.reconnectModbus();
      setStatus(response);
      if (!response.connected) {
        setActionError(response.message || "Modbus se nepodařilo připojit");
      }
    } catch (error) {
      setActionError(error.message || "Modbus se nepodařilo připojit");
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  const message =
    status.message ||
    status.last_error ||
    `Modbus na portu ${status.port || "/dev/ttyUSB0"} není připojen`;

  return (
    <div className="modbus-status-banner" role="alert">
      <div className="modbus-status-banner__content">
        <AlertTriangle className="modbus-status-banner__icon" size={20} />
        <div className="modbus-status-banner__text">
          <strong>Chyba Modbus komunikace</strong>
          <span>{message}</span>
          {actionError && actionError !== message && (
            <small>{actionError}</small>
          )}
        </div>
      </div>
      <button
        className="modbus-status-banner__button"
        type="button"
        onClick={handleReconnect}
        disabled={isRetrying}
      >
        <RefreshCw
          className={isRetrying ? "modbus-status-banner__spinner" : ""}
          size={16}
        />
        {isRetrying ? "Připojuji..." : "Zkusit znovu"}
      </button>
    </div>
  );
};

export default ModbusStatusBanner;
