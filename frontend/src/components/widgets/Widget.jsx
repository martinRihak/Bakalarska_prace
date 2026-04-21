import React, { useState, useEffect, useMemo } from "react";
import { RefreshCw, ImageOff, CircleX } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import api from "@/api/apiService";
import {
  getAreaChartOptions,
  getLineChartOptions,
  getRadialBarChartOptions,
  getAreaChartSeries,
  getLineChartSeries,
  getRadialBarChartSeries,
} from "./chartUtils";
import ValueWidget from "./ValueWidget";
import "./Widget.css";

const getThemeMode = () => {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.classList.contains("dark-mode")
    ? "dark"
    : "light";
};

const Widget = ({
  title,
  widget_id,
  sensorName,
  id,
  active,
  time,
  widgetType,
  dashboard_id,
  onDelete,
}) => {
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [timeRange, setTimeRange] = useState(time);
  const [localActive, setLocalActive] = useState(active); // lokální stav pro switch
  const [themeMode, setThemeMode] = useState(getThemeMode);

  const isGaugeType = widgetType === "bar" || widgetType === "radialBar";

  const processedData = useMemo(() => {
    if (widgetType === "value" || isGaugeType) {
      return null;
    }
    if (!sensorData || !sensorData.length) return [];
    const maxPoints =
      timeRange === "24h" ? 144 : timeRange === "7d" ? 168 : 720;
    const step = Math.max(1, Math.floor(sensorData.length / maxPoints));
    return sensorData.filter((_, index) => index % step === 0);
  }, [sensorData, timeRange, widgetType, isGaugeType]);

  useEffect(() => {
    if (!localActive) {
      setError("Senzor je neaktivní");
      setSensorData(null);
    } else {
      fetchData();
    }
  }, [id, timeRange, localActive]);

  useEffect(() => {
    setLocalActive(active); // Synchronizace s prop při změně z nadřazené komponenty
  }, [active]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeMode(getThemeMode());
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      let response;
      if (widgetType === "value" || isGaugeType) {
        response = await api.getLatestSensorData(id);
        if (!response || !response.data) {
          setError("Žádná data k zobrazení");
          return;
        }
        setSensorData(response);
      }
      else {
        response = await api.getSensorHistory(id, timeRange,widget_id);
        if (!response || !response.data || response.data.length === 0) {
          setError("Žádná data k zobrazení");
          return;
        }
        setSensorData(response.data);
      }
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError("Nepodařilo se načíst data");
    } finally {
    }
  };

  const chartOptions = useMemo(() => {
    const runtimeChartOptions = {
      chart: {
        animations: {
          enabled:
            !sensorData ||
            (Array.isArray(sensorData) && sensorData.length < 1000),
          dynamicAnimation: {
            speed: 350,
          },
        },
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
      },
    };

    let themedOptions;
    if (isGaugeType) {
      themedOptions = getRadialBarChartOptions(
        sensorName,
        themeMode,
        sensorData?.sensor?.min_value,
        sensorData?.sensor?.max_value,
        sensorData?.sensor?.unit
      );
      return themedOptions;
    }
    switch (widgetType) {
      case "area":
        themedOptions = getAreaChartOptions(sensorName, themeMode);
        break;
      default:
        themedOptions = getLineChartOptions(sensorName, themeMode);
        break;
    }

    return {
      ...themedOptions,
      chart: {
        ...themedOptions.chart,
        ...runtimeChartOptions.chart,
      },
    };
  }, [widgetType, sensorName, sensorData, themeMode, isGaugeType]);

  const chartSeries = useMemo(() => {
    if (widgetType === "value") {
      return [];
    }
    if (isGaugeType) {
      return getRadialBarChartSeries(
        sensorData?.data?.value,
        sensorData?.sensor?.min_value,
        sensorData?.sensor?.max_value
      );
    }
    if (!processedData || processedData.length === 0) return [];
    switch (widgetType) {
      case "area":
        return getAreaChartSeries(processedData, sensorName);
      default:
        return getLineChartSeries(processedData, sensorName);
    }
  }, [widgetType, sensorData, processedData, sensorName, isGaugeType]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleToggleActive = async (sensorId, newStatus) => {
    try {
      await api.toggleSensorActive(sensorId, newStatus);
      setLocalActive(newStatus);
      
      if (newStatus) {
        // Pokud je senzor aktivován, okamžitě načteme nová data
        setError(null); // Reset error message
        fetchData();
      } else {
        // Pokud je senzor deaktivován, zobrazíme zprávu
        setError("Senzor je neaktivní");
        setSensorData(null);
      }
    } catch (err) {
      setError("Nepodařilo se změnit stav senzoru");
      setLocalActive(!newStatus); // Revert lokálního stavu při chybě
    }
  };

  const deleteWidget =  () => {
    api
      .deleteWidget(dashboard_id, widget_id)
      .then(() => {
        if (onDelete) {
          onDelete();
        }
      })
      .catch((error) => {
        console.error("Error deleting widget:", error);
      });
  };

  return (
    <div className={`widget ${widgetType}`}>
      <div className="widget-header">
        <h3>{title}</h3>
        <div className="widget-controls">
          <div>
            {!isGaugeType && widgetType !== "value" && (
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="time-range-select"
              >
                <option value="24h">24 hodin</option>
                <option value="7d">7 dní</option>
                <option value="30d">30 dní</option>
              </select>
            )}
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={localActive}
              onChange={() => {
                const newStatus = !localActive;
                setLocalActive(newStatus);
                handleToggleActive(id, newStatus);
              }}
            />
            <span className="slider"></span>
          </label>                  
          <button onClick={deleteWidget}>
            <CircleX />
          </button>
          <button onClick={() => {
              handleRefresh();
            }}>
  <RefreshCw />
</button>
        </div>
      </div>
      <div className="widget-content">
        {error ? (
          <div className="error-message">
            <ImageOff />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {widgetType === "value" ? (
              <div className="value-widget">
                <ValueWidget sensorData={sensorData} />
              </div>
            ) : (
              <ReactApexChart
                key={`${widget_id}-${widgetType}-${themeMode}`}
                options={chartOptions}
                series={chartSeries}
                type={isGaugeType ? "radialBar" : widgetType}
                height="100%"
                width="100%"
              />
            )}
          </>
        )}
      </div>
      {lastUpdate && (
        <div className="widget-footer">
          <small>
            Poslední aktualizace: {lastUpdate.toLocaleTimeString("cs-CZ")}
          </small>
        </div>
      )}
    </div>
  );
};

export default Widget;
