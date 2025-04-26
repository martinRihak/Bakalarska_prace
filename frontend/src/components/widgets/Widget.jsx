import React, { useState, useEffect, useMemo } from "react";
import { RefreshCw, ImageOff } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import api from "@services/apiService";
import {
  getAreaChartOptions,
  getEnhancedRadialBarOptions,
  getLineChartOptions,
  getRadialBarOptions,
  getAreaChartSeries,
  getEnhancedRadialBarSeries,
  getLineChartSeries,
  getRadialBarSeries
} from "./chartUtils";

const Widget = ({ title, sensorName, id, widgetType }) => {
  const [sensorData, setSensorData] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');

  // Memoizace zpracovaných dat pro grafy
  const processedData = useMemo(() => {
    if (!sensorData || !sensorData.length) return [];
    
    // Optimalizace počtu bodů podle typu grafu a časového rozsahu
    const maxPoints = timeRange === '24h' ? 144 : timeRange === '7d' ? 168 : 720;
    const step = Math.max(1, Math.floor(sensorData.length / maxPoints));
    
    return sensorData.filter((_, index) => index % step === 0);
  }, [sensorData, timeRange]);

  useEffect(() => {
    fetchData();
  }, [id, timeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let response;
      
      // Pro radialBar widget volat API koncový bod pro nejnovější data
      if (widgetType === 'radialBar' || widgetType === 'enhancedRadialBar') {
        response = await api.getLatestSensorData(id);
        if (!response || !response.data) {
          setError("Žádná data k zobrazení");
          return;
        }
        // Převést jediný datový bod na pole pro kompatibilitu
        setSensorData([response.data]);
      } else {
        // Pro ostatní typy widgetů volat historická data jako dříve
        response = await api.getSensorHistory(id, timeRange);
        if (!response || !response.data || response.data.length === 0) {
          setError("Žádná data k zobrazení");
          return;
        }
        setSensorData(response.data);
      }
      
      setError(null);
      setLastUpdate(new Date());
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
          enabled: sensorData.length < 1000,
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
      case "enhancedRadialBar":
        return { ...getEnhancedRadialBarOptions(sensorName), ...baseOptions };
      case "radialBar":
        return { ...getRadialBarOptions(sensorName), ...baseOptions };
      default:
        return { ...getLineChartOptions(sensorName), ...baseOptions };
    }
  }, [widgetType, sensorName, sensorData.length]);

  const chartSeries = useMemo(() => {
    switch (widgetType) {
      case "area":
        return getAreaChartSeries(processedData, sensorName);
      case "enhancedRadialBar":
        return getEnhancedRadialBarSeries(processedData, sensorName);
      case "radialBar":
        return getRadialBarSeries(processedData, sensorName);
      default:
        return getLineChartSeries(processedData, sensorName);
    }
  }, [widgetType, processedData, sensorName]);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <div className="widget">
      <div className="widget-header">
        <h3>{title}</h3>
        <div className="widget-controls">
          {(widgetType !== 'radialBar' && widgetType !== 'enhancedRadialBar') && (
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
        ) : (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type={widgetType}
            height="100%"
            width="100%"
          />
        )}
      </div>
      {lastUpdate && (
        <div className="widget-footer">
          <small>Poslední aktualizace: {lastUpdate.toLocaleTimeString()}</small>
        </div>
      )}
    </div>
  );
};

export default Widget;