import React, { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import api from "@/api/apiService";
import UserBar from "@/components/layout/UserBar";
import { getLineChartOptions } from "@/components/widgets/chartUtils";
import "@css/WeatherPage.css";

const toISODate = (date) => date.toISOString().slice(0, 10);

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return { start: toISODate(start), end: toISODate(end) };
};

const WeatherPage = () => {
  const defaultRange = getDefaultRange();
  const [locationInput, setLocationInput] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  // Sensor comparison
  const [userSensors, setUserSensors] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState("");
  const [sensorHistory, setSensorHistory] = useState(null);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [comparisonMetric, setComparisonMetric] = useState("temperature");

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
        const sensors = await api.getUserSensors();
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

  // Načtení historie senzoru
  useEffect(() => {
    if (!selectedSensorId || !weatherData) {
      setSensorHistory(null);
      return;
    }

    const fetchSensorHistory = async () => {
      setSensorLoading(true);
      try {
        const result = await api.getSensorHistoryHourly(
          selectedSensorId,
          startDate,
          endDate,
        );
        setSensorHistory(result);
      } catch {
        setSensorHistory(null);
      } finally {
        setSensorLoading(false);
      }
    };
    fetchSensorHistory();
  }, [selectedSensorId, weatherData, startDate, endDate]);

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
    if (!weatherData?.daily) return [];
    const source = weatherData.daily;
    if (!Array.isArray(source.time)) return [];

    return source.time.map((date, index) => ({
      date,
      temp_max: source.temperature_2m_max?.[index] ?? null,
      temp_min: source.temperature_2m_min?.[index] ?? null,
      sunrise: source.sunrise?.[index] ?? null,
      sunset: source.sunset?.[index] ?? null,
      daylight_duration: source.daylight_duration?.[index] ?? null,
    }));
  }, [weatherData]);

  // Hodinová data pro 24h
  const hourlyForecast = useMemo(() => {
    if (!weatherData?.hourly) return [];
    const h = weatherData.hourly;
    if (!Array.isArray(h.time)) return [];

    return h.time.map((time, index) => ({
      time,
      temperature: h.temperature_2m?.[index] ?? null,
      humidity: h.relative_humidity_2m?.[index] ?? null,
    }));
  }, [weatherData]);

  // Chart data — porovnání API teploty se senzorem
  const weatherChartOptions = useMemo(() => {
    const base = getLineChartOptions("Teplota (°C)");
    return {
      ...base,
      colors: ["#ef4444", "#3b82f6"],
      legend: { ...base.legend, show: true, position: "top" },
    };
  }, []);

  const weatherChartSeries = useMemo(() => {
    if (dailyForecast.length === 0) return [];
    return [
      {
        name: "Max. teplota (°C)",
        data: dailyForecast
          .filter((d) => d.temp_max !== null)
          .map((d) => ({
            x: new Date(d.date).getTime(),
            y: parseFloat(Number(d.temp_max).toFixed(1)),
          })),
      },
      {
        name: "Min. teplota (°C)",
        data: dailyForecast
          .filter((d) => d.temp_min !== null)
          .map((d) => ({
            x: new Date(d.date).getTime(),
            y: parseFloat(Number(d.temp_min).toFixed(1)),
          })),
      },
    ];
  }, [dailyForecast]);

  const comparisonChartOptions = useMemo(() => {
    const isHumidity = comparisonMetric === "humidity";
    const base = getLineChartOptions(isHumidity ? "Vlhkost (%)" : "Teplota (°C)");
    return {
      ...base,
      colors: ["#3b82f6", "#f59e0b"],
      legend: {
        ...base.legend,
        show: true,
        position: "top",
      },
    };
  }, [comparisonMetric]);

  const comparisonChartSeries = useMemo(() => {
    const series = [];
    const isHumidity = comparisonMetric === "humidity";

    if (hourlyForecast.length > 0) {
      series.push({
        name: isHumidity ? "API vlhkost (%)" : "API teplota (°C)",
        data: hourlyForecast
          .filter((h) => (isHumidity ? h.humidity : h.temperature) !== null)
          .map((h) => ({
            x: new Date(h.time).getTime(),
            y: parseFloat(
              Number(isHumidity ? h.humidity : h.temperature).toFixed(1),
            ),
          })),
      });
    }

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
  }, [hourlyForecast, sensorHistory, comparisonMetric]);

  const formatValue = (value, unit = "") => {
    if (value === null || value === undefined || value === "") return "N/A";
    return `${value}${unit}`;
  };

  const formatTime = (iso) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDaylight = (seconds) => {
    if (seconds === null || seconds === undefined) return "N/A";
    const total = Math.round(Number(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Pokud je vybraná suggestion, použijeme její souřadnice
    const hasCoords = selectedSuggestion?.latitude && selectedSuggestion?.longitude;
    const locationLabel = selectedSuggestion
      ? formatLocationLabel(selectedSuggestion)
      : locationInput.trim();

    let selectedCoordinates = selectedSuggestion;

    if (!selectedCoordinates && locationSuggestions.length > 0) {
      selectedCoordinates = locationSuggestions[0];
    }

    if (!selectedCoordinates && locationInput.trim()) {
      try {
        const fallbackSuggestions = await api.searchWeatherLocations(locationInput.trim());
        if (fallbackSuggestions.length > 0) {
          selectedCoordinates = fallbackSuggestions[0];
        }
      } catch {
        // handled by generic message below when coordinates are missing
      }
    }

    if (!selectedCoordinates?.latitude || !selectedCoordinates?.longitude) {
      setError("Zadejte prosím lokalitu.");
      setWeatherData(null);
      return;
    }

    if (!hasCoords) {
      setError("Vyberte lokalitu z návrhů pro přesné souřadnice.");
      setWeatherData(null);
      return;
    }

    if (!startDate || !endDate) {
      setError("Zadejte platný začátek i konec intervalu.");
      setWeatherData(null);
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("Konec intervalu musí být po začátku.");
      setWeatherData(null);
      return;
    }

    setLoading(true);
    setShowSuggestions(false);
    setError("");

    try {
      const response = await api.getWeatherForecast({
          latitude: selectedSuggestion.latitude,
          longitude: selectedSuggestion.longitude,
          locationName: locationLabel,
          startDate,
          endDate,
        });
      setWeatherData(response);
      setSelectedLocation(response?.location?.display_name || locationLabel);
    } catch (err) {
      setWeatherData(null);
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

      {/* Interval */}
      <div className="weather-time-range">
        <label htmlFor="weather-start-date">
          Od
          <input
            id="weather-start-date"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label htmlFor="weather-end-date">
          Do
          <input
            id="weather-end-date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
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
          {weatherData.location && (
            <p className="weather-meta">
              {weatherData.location.latitude}, {weatherData.location.longitude}
              {weatherData.timezone ? ` | ${weatherData.timezone}` : ""}
            </p>
          )}

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

          {/* Hodinová předpověď */}
          {hourlyForecast.length > 0 && (
            <div className="weather-forecast">
              <h2>Hodinová předpověď</h2>
              <div className="weather-day-grid weather-hourly-grid">
                {hourlyForecast.slice(0, 24).map((hour, index) => (
                  <article className="weather-day-card" key={`${hour.time}-${index}`}>
                    <h3>{hour.time?.split("T")[1] || `${index}:00`}</h3>
                    <p>Teplota: {formatValue(hour.temperature, " °C")}</p>
                    <p>Vlhkost: {formatValue(hour.humidity, " %")}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Denní předpověď */}
          {dailyForecast.length > 0 && (
            <div className="weather-forecast">
              <h2>Denní předpověď</h2>
              {weatherChartSeries.length > 0 && (
                <div className="weather-chart">
                  <ReactApexChart
                    options={weatherChartOptions}
                    series={weatherChartSeries}
                    type="line"
                    height={320}
                  />
                </div>
              )}
              <div className="weather-day-grid">
                {dailyForecast.map((day, index) => (
                  <article className="weather-day-card" key={`${day.date || "day"}-${index}`}>
                    <h3>{day.date || `Den ${index + 1}`}</h3>
                    <p>Max: {formatValue(day.temp_max, " °C")}</p>
                    <p>Min: {formatValue(day.temp_min, " °C")}</p>
                    <p>Východ slunce: {formatTime(day.sunrise)}</p>
                    <p>Západ slunce: {formatTime(day.sunset)}</p>
                    <p>Délka dne: {formatDaylight(day.daylight_duration)}</p>
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
              <label htmlFor="comparison-metric">Veličina</label>
              <select
                id="comparison-metric"
                value={comparisonMetric}
                onChange={(e) => setComparisonMetric(e.target.value)}
              >
                <option value="temperature">Teplota</option>
                <option value="humidity">Vlhkost</option>
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
