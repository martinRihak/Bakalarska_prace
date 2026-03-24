import React, { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import api from "@/api/apiService";
import useApi from "@/hooks/useApi";
import UserBar from "@/components/layout/UserBar";
import { getLineChartOptions } from "@/components/widgets/chartUtils";
import "@css/WeatherPage.css";

const TIME_RANGES = [
  { value: "24h", label: "24 hodin" },
  { value: "7d", label: "7 dní" },
  { value: "30d", label: "30 dní" },
];

const WeatherPage = () => {
  const { callApi } = useApi();
  const [locationInput, setLocationInput] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("7d");

  // Sensor comparison
  const [userSensors, setUserSensors] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState("");
  const [sensorHistory, setSensorHistory] = useState(null);
  const [sensorLoading, setSensorLoading] = useState(false);

  const formatLocationLabel = (locationItem) => {
    if (!locationItem) return "";
    return [locationItem.name, locationItem.admin1, locationItem.country]
      .filter(Boolean)
      .join(", ");
  };

  // Načtení uživatelských senzorů
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const sensors = await callApi(() => api.getUserSensors());
        setUserSensors(sensors || []);
      } catch {
        setUserSensors([]);
      }
    };
    fetchSensors();
  }, []);

  // Autocomplete lokalit
  useEffect(() => {
    const query = locationInput.trim();

    if (query.length < 2) {
      setLocationSuggestions([]);
      setAutocompleteLoading(false);
      return;
    }

    let isActive = true;
    const timeoutId = setTimeout(async () => {
      setAutocompleteLoading(true);
      try {
        const suggestions = await api.searchWeatherLocations(query);
        if (isActive) {
          setLocationSuggestions(suggestions);
        }
      } catch {
        if (isActive) {
          setLocationSuggestions([]);
        }
      } finally {
        if (isActive) {
          setAutocompleteLoading(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [locationInput]);

  // Načtení historie senzoru při změně výběru nebo timeRange
  useEffect(() => {
    if (!selectedSensorId || !weatherData) {
      setSensorHistory(null);
      return;
    }

    const fetchSensorHistory = async () => {
      setSensorLoading(true);
      try {
        const sensorTimeRange =
          timeRange === "24h" ? "24h" : timeRange === "30d" ? "30d" : "7d";
        const result = await callApi(() =>
          api.getSensorHistory(selectedSensorId, sensorTimeRange),
        );
        setSensorHistory(result);
      } catch {
        setSensorHistory(null);
      } finally {
        setSensorLoading(false);
      }
    };
    fetchSensorHistory();
  }, [selectedSensorId, weatherData, timeRange]);

  const currentWeather = useMemo(() => {
    if (!weatherData) return null;
    return (
      weatherData.current_weather ||
      weatherData.currentWeather ||
      weatherData.current ||
      null
    );
  }, [weatherData]);

  const dailyForecast = useMemo(() => {
    if (!weatherData) return [];

    const source =
      weatherData.daily_forecast || weatherData.dailyForecast || weatherData.daily;

    if (!source) return [];
    if (Array.isArray(source)) return source;

    if (Array.isArray(source.time)) {
      return source.time.map((date, index) => ({
        date,
        temp_max:
          source.temperature_2m_max?.[index] ??
          source.temp_max?.[index] ??
          source.max?.[index] ??
          null,
        temp_min:
          source.temperature_2m_min?.[index] ??
          source.temp_min?.[index] ??
          source.min?.[index] ??
          null,
        precipitation:
          source.precipitation_sum?.[index] ??
          source.precipitation?.[index] ??
          null,
        weather_code: source.weathercode?.[index] ?? source.weather_code?.[index] ?? null,
      }));
    }

    return [];
  }, [weatherData]);

  // Hodinová data pro 24h
  const hourlyForecast = useMemo(() => {
    if (!weatherData?.hourly) return [];
    const h = weatherData.hourly;
    if (!Array.isArray(h.time)) return [];

    return h.time.map((time, index) => ({
      time,
      temperature: h.temperature_2m?.[index] ?? null,
      precipitation: h.precipitation?.[index] ?? null,
      weather_code: h.weather_code?.[index] ?? null,
    }));
  }, [weatherData]);

  // Chart data — porovnání API teploty se senzorem
  const comparisonChartOptions = useMemo(() => {
    const base = getLineChartOptions("Teplota (°C)");
    return {
      ...base,
      colors: ["#3b82f6", "#f59e0b"],
      legend: {
        ...base.legend,
        show: true,
        position: "top",
      },
    };
  }, []);

  const comparisonChartSeries = useMemo(() => {
    const series = [];

    // API data série
    if (timeRange === "24h" && hourlyForecast.length > 0) {
      series.push({
        name: "API teplota (hodinová)",
        data: hourlyForecast
          .filter((h) => h.temperature !== null)
          .map((h) => ({
            x: new Date(h.time).getTime(),
            y: parseFloat(h.temperature.toFixed(1)),
          })),
      });
    } else if (dailyForecast.length > 0) {
      series.push({
        name: "API teplota (max)",
        data: dailyForecast
          .filter((d) => d.temp_max !== null)
          .map((d) => ({
            x: new Date(d.date).getTime(),
            y: parseFloat(Number(d.temp_max).toFixed(1)),
          })),
      });
    }

    // Sensor data série
    if (sensorHistory?.data?.length > 0) {
      series.push({
        name: `${sensorHistory.sensor?.name || "Senzor"} (${sensorHistory.sensor?.unit || ""})`,
        data: sensorHistory.data.map((d) => ({
          x: new Date(d.timestamp).getTime(),
          y: parseFloat(d.value.toFixed(1)),
        })),
      });
    }

    return series;
  }, [timeRange, hourlyForecast, dailyForecast, sensorHistory]);

  const formatValue = (value, unit = "") => {
    if (value === null || value === undefined || value === "") return "N/A";
    return `${value}${unit}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Pokud je vybraná suggestion, použijeme její souřadnice
    const hasCoords = selectedSuggestion?.latitude && selectedSuggestion?.longitude;
    const locationLabel = selectedSuggestion
      ? formatLocationLabel(selectedSuggestion)
      : locationInput.trim();

    if (!locationLabel) {
      setError("Zadejte prosím lokalitu.");
      setWeatherData(null);
      return;
    }

    if (!hasCoords) {
      setError("Vyberte lokalitu z návrhů pro přesné souřadnice.");
      setWeatherData(null);
      return;
    }

    setLoading(true);
    setShowSuggestions(false);
    setError("");

    try {
      const response = await callApi(() =>
        api.getWeatherForecast({
          latitude: selectedSuggestion.latitude,
          longitude: selectedSuggestion.longitude,
          locationName: locationLabel,
          timeRange,
        }),
      );
      setWeatherData(response);
      setSelectedLocation(locationLabel);
    } catch (err) {
      setWeatherData(null);
      setError(err.message || "Nepodařilo se načíst data počasí.");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = async (newRange) => {
    setTimeRange(newRange);

    // Pokud už máme data, automaticky přenačteme s novým rozsahem
    if (!selectedSuggestion?.latitude || !selectedSuggestion?.longitude) return;

    setLoading(true);
    setError("");
    try {
      const response = await callApi(() =>
        api.getWeatherForecast({
          latitude: selectedSuggestion.latitude,
          longitude: selectedSuggestion.longitude,
          locationName: formatLocationLabel(selectedSuggestion),
          timeRange: newRange,
        }),
      );
      setWeatherData(response);
    } catch (err) {
      setError(err.message || "Nepodařilo se načíst data počasí.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (event) => {
    setLocationInput(event.target.value);
    setSelectedSuggestion(null);
    setShowSuggestions(true);
  };

  const handleSuggestionSelect = (locationItem) => {
    setSelectedSuggestion(locationItem);
    setLocationInput(formatLocationLabel(locationItem));
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="main-content weather-page">
      <UserBar />
      <h1>Předpověď počasí</h1>

      <form className="weather-search-form" onSubmit={handleSubmit}>
        <label htmlFor="weather-location">Lokalita</label>
        <div className="weather-location-field">
          <input
            id="weather-location"
            type="text"
            placeholder="Např. Prague, Brno, Ostrava"
            value={locationInput}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onChange={handleLocationChange}
            autoComplete="off"
          />
          {showSuggestions && (
            <div className="weather-autocomplete">
              {autocompleteLoading && (
                <p className="weather-autocomplete-status">Hledám lokality...</p>
              )}

              {!autocompleteLoading &&
                locationInput.trim().length >= 2 &&
                locationSuggestions.length === 0 && (
                  <p className="weather-autocomplete-status">Žádné návrhy.</p>
                )}

              {!autocompleteLoading && locationSuggestions.length > 0 && (
                <ul>
                  {locationSuggestions.map((locationItem) => (
                    <li key={locationItem.id}>
                      <button
                        type="button"
                        onMouseDown={() => handleSuggestionSelect(locationItem)}
                      >
                        {formatLocationLabel(locationItem)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Načítám..." : "Načíst počasí"}
        </button>
      </form>
      <p className="weather-autocomplete-hint">
        Návrhy lokalit jsou načítané z Open-Meteo Geocoding API.
      </p>

      {/* Časový rozsah */}
      <div className="weather-time-range">
        {TIME_RANGES.map((range) => (
          <button
            key={range.value}
            type="button"
            className={`weather-time-range-btn${timeRange === range.value ? " active" : ""}`}
            onClick={() => handleTimeRangeChange(range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>

      {error && <p className="weather-error">{error}</p>}

      {!weatherData && !loading && !error && (
        <p className="weather-hint">
          Zadejte lokalitu a načtěte předpověď z backendu.
        </p>
      )}

      {weatherData && (
        <section className="weather-results">
          <h2>Výsledek pro: {selectedLocation}</h2>

          {currentWeather && (
            <div className="weather-card-grid">
              <article className="weather-card">
                <h3>Aktuální teplota</h3>
                <p>{formatValue(currentWeather.temperature, " °C")}</p>
              </article>
              <article className="weather-card">
                <h3>Rychlost větru</h3>
                <p>{formatValue(currentWeather.windspeed, " km/h")}</p>
              </article>
              <article className="weather-card">
                <h3>Směr větru</h3>
                <p>{formatValue(currentWeather.winddirection, "°")}</p>
              </article>
              <article className="weather-card">
                <h3>Kód počasí</h3>
                <p>{formatValue(currentWeather.weathercode)}</p>
              </article>
            </div>
          )}

          {/* Hodinová předpověď pro 24h */}
          {timeRange === "24h" && hourlyForecast.length > 0 && (
            <div className="weather-forecast">
              <h2>Hodinová předpověď</h2>
              <div className="weather-day-grid weather-hourly-grid">
                {hourlyForecast.slice(0, 24).map((hour, index) => (
                  <article className="weather-day-card" key={`${hour.time}-${index}`}>
                    <h3>{hour.time?.split("T")[1] || `${index}:00`}</h3>
                    <p>Teplota: {formatValue(hour.temperature, " °C")}</p>
                    <p>Srážky: {formatValue(hour.precipitation, " mm")}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Denní předpověď pro 7d / 30d */}
          {timeRange !== "24h" && dailyForecast.length > 0 && (
            <div className="weather-forecast">
              <h2>Denní předpověď</h2>
              <div className="weather-day-grid">
                {dailyForecast.map((day, index) => (
                  <article className="weather-day-card" key={`${day.date || "day"}-${index}`}>
                    <h3>{day.date || `Den ${index + 1}`}</h3>
                    <p>Max: {formatValue(day.temp_max, " °C")}</p>
                    <p>Min: {formatValue(day.temp_min, " °C")}</p>
                    <p>Srážky: {formatValue(day.precipitation, " mm")}</p>
                    <p>Kód: {formatValue(day.weather_code)}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Porovnání se senzorem */}
          <div className="weather-comparison">
            <h2>Porovnání s mým senzorem</h2>
            <div className="weather-comparison-controls">
              <label htmlFor="sensor-select">Vyberte senzor</label>
              <select
                id="sensor-select"
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
              >
                <option value="">— žádný —</option>
                {userSensors.map((sensor) => (
                  <option key={sensor.sensor_id} value={sensor.sensor_id}>
                    {sensor.name} ({sensor.unit})
                  </option>
                ))}
              </select>
            </div>

            {sensorLoading && <p>Načítám data senzoru...</p>}

            {comparisonChartSeries.length > 0 && (
              <div className="weather-comparison-chart">
                <ReactApexChart
                  options={comparisonChartOptions}
                  series={comparisonChartSeries}
                  type="line"
                  height={380}
                />
              </div>
            )}

            {selectedSensorId && !sensorLoading && !sensorHistory?.data?.length && (
              <p className="weather-hint">
                Senzor nemá data pro zvolený časový rozsah.
              </p>
            )}
          </div>

          {!currentWeather && dailyForecast.length === 0 && hourlyForecast.length === 0 && (
            <div className="weather-raw-response">
              <h2>Odpověď backendu</h2>
              <pre>{JSON.stringify(weatherData, null, 2)}</pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default WeatherPage;
