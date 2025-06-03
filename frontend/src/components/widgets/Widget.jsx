import React, { useState, useEffect, useMemo } from "react";
import { RefreshCw, ImageOff, CircleX, ChartNoAxesColumnIcon } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import api from "@services/apiService";
import {
  getAreaChartOptions,
  getLineChartOptions,
  getAreaChartSeries,
  getLineChartSeries,
} from "./chartUtils";
import ValueWidget from "./ValueWidget";
import "./Widget.css";

const Widget = ({
  title,
  widget_id,
  sensorName,
  id,
  active,
  widgetType,
  dashboard_id,
  onDelete,
}) => {
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);
  const [sensor, setSensor] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [timeRange, setTimeRange] = useState("24h");
  const [localActive, setLocalActive] = useState(active); // Lokální stav pro switch

  const processedData = useMemo(() => {
    if (widgetType === "minMax" || widgetType === "value") {
      return null;
    }
    if (!sensorData || !sensorData.length) return [];
    const maxPoints =
      timeRange === "24h" ? 144 : timeRange === "7d" ? 168 : 720;
    const step = Math.max(1, Math.floor(sensorData.length / maxPoints));
    return sensorData.filter((_, index) => index % step === 0);
  }, [sensorData, timeRange, widgetType]);

  useEffect(() => {
    fetchData();
  }, [id, timeRange]);

  useEffect(() => {
    setLocalActive(active); // Synchronizace s prop při změně z nadřazené komponenty
  }, [active]);

  const fetchData = async () => {
    try {
      let response;
      console.log(id)
      console.log(active)
      if (widgetType === "value") {
        response = await api.getLatestSensorData(id);
        if (!response || !response.data) {
          setError("Žádná data k zobrazení");
          return;
        }
        setSensorData(response);
      } 
      else {
        response = await api.getSensorHistory(id, timeRange);
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
    const baseOptions = {
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

    switch (widgetType) {
      case "area":
        return { ...getAreaChartOptions(sensorName), ...baseOptions };
      case "radialBar":
        return { ...getRadialBarOptions(sensorName), ...baseOptions };
      default:
        return { ...getLineChartOptions(sensorName), ...baseOptions };
    }
  }, [widgetType, sensorName, sensorData]);

  const chartSeries = useMemo(() => {
    if (widgetType === "radialBar") {
      return getRadialBarSeries(processedData);
    } else if (widgetType === "value") {
      return [];
    } else {
      if (!processedData || processedData.length === 0) return [];
      return widgetType === "area"
        ? getAreaChartSeries(processedData, sensorName)
        : getLineChartSeries(processedData, sensorName);
    }
  }, [widgetType, sensorData, processedData, sensorName]);

  const handleRefresh = () => {
    console.log("Refreshing data...");
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
        console.log("Widget deleted successfully");
        if (onDelete) {
          onDelete();
        }
      })
      .catch((error) => {
        console.error("Error deleting widget:", error);
      });
  };

  return (
    <div className="widget ${widgetType}">
      <div className="widget-header">
        <h3>{title}</h3>
        <div className="widget-controls">
          {widgetType !== "radialBar" && widgetType !== "value" && (
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
          <button
  onClick={() => {
    console.log("Button clicked, isLoading:");
    handleRefresh();
  }}
>
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
        ) : widgetType === "value" ? (
          <ValueWidget sensorData={sensorData} />
        ) : (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type={widgetType === "radialBar" ? "radialBar" : widgetType}
            height="100%"
            width="100%"
          />
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