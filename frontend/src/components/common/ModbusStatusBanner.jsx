import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import api from "@/api/apiService";
import "./ModbusStatusBanner.css";

const POLL_INTERVAL_MS = 10000;

const ModbusStatusBanner = ({ onVisibilityChange }) => {
  const [status, setStatus] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionError, setActionError] = useState("");

  const isVisible = Boolean(status && status.connected === false);

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!localStorage.getItem("token")) {
      setStatus(null);
      return;
    }

    try {
      const response = await api.getModbusStatus();
      setStatus(response);
      if (response.connected) {
        setActionError("");
      }
    } catch (error) {
      if (!silent) {
        setActionError(error.message || "Nepodařilo se ověřit stav Modbusu");
      }
    }
  }, []);

  useEffect(() => {
    loadStatus({ silent: true });
    const intervalId = window.setInterval(
      () => loadStatus({ silent: true }),
      POLL_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
      onVisibilityChange?.(false);
    };
  }, [loadStatus, onVisibilityChange]);

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
