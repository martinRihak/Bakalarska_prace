import React, { useState, useEffect, useMemo } from "react";
import { RefreshCw, ImageOff } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import api from "@services/apiService";
import {
  getAreaChartOptions,
  getLineChartOptions,
  getRadialBarOptions,
  getAreaChartSeries,
  getLineChartSeries,
  getRadialBarSeries
} from "./chartUtils";
import ValueWidget from "./ValueWidget"; // Import the new component

const Widget = ({ title, sensorName, id, widgetType }) => {
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');

  const processedData = useMemo(() => {
    if (widgetType === 'radialBar' || widgetType === 'value') {
      return null; // No processing needed for 'value' or 'radialBar'
    }
    if (!sensorData || !sensorData.length) return [];
    const maxPoints = timeRange === '24h' ? 144 : timeRange === '7d' ? 168 : 720;
    const step = Math.max(1, Math.floor(sensorData.length / maxPoints));
    return sensorData.filter((_, index) => index % step === 0);
  }, [sensorData, timeRange, widgetType]);

  useEffect(() => {
    fetchData();
  }, [id, timeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let response;
      if (widgetType === 'value') {
        response = await api.getLatestSensorData(id);
        if (!response || !response.data) {
          setError("Žádná data k zobrazení");
          return;
        }

        setSensorData(response);
      } else {
        response = await api.getSensorHistory(id, timeRange);
        if (!response || !response.data || response.data.length === 0) {
          setError("Žádná data k zobrazení");
          return;
        }
        setSensorData(response.data);
      }
      setLastUpdate(new Date()); // Set to fetch time
      setError(null);
    } catch (err) {
      setError("Nepodařilo se načíst data");
    } finally {
      setIsLoading(false);
    }
  };

  const chartOptions = useMemo(() => {
    const baseOptions = {
      chart: {
        animations: {
          enabled: !sensorData || (Array.isArray(sensorData) && sensorData.length < 1000),
          dynamicAnimation: {
            speed: 350
          }
        },
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
      },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        followCursor: true
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
    if (widgetType === 'radialBar') {
      return getRadialBarSeries(processedData);
    } else if (widgetType === 'value') {
      return []; // No series needed for ValueWidget
    } else {
      if (!processedData || processedData.length === 0) return [];
      return widgetType === 'area'
        ? getAreaChartSeries(processedData, sensorName)
        : getLineChartSeries(processedData, sensorName);
    }
  }, [widgetType, sensorData, processedData, sensorName]);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <div className="widget">
      <div className="widget-header">
        <h3>{title}</h3>
        <div className="widget-controls">
          {widgetType !== 'radialBar' && widgetType !== 'value' && (
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
          <button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>
      <div className="widget-content">
        {error ? (
          <div className="error-message">
            <ImageOff />
            <p>{error}</p>
          </div>
        ) : widgetType === 'value' ? (
          <ValueWidget sensorData={sensorData} />
        ) : (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type={widgetType === 'radialBar' ? 'radialBar' : widgetType}
            height="100%"
            width="100%"
          />
        )}
      </div>
      {lastUpdate && (
        <div className="widget-footer">
          <small>Poslední aktualizace: {lastUpdate.toLocaleTimeString('cs-CZ')}</small>
        </div>
      )}
    </div>
  );
};

export default Widget;