import React, { useMemo, useState } from "react";
import api from "@/api/apiService";
import useApi from "@/hooks/useApi";
import UserBar from "@/components/layout/UserBar";
import "@css/WeatherPage.css";

const WeatherPage = () => {
  const { callApi } = useApi();
  const [locationInput, setLocationInput] = useState("Prague");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const formatValue = (value, unit = "") => {
    if (value === null || value === undefined || value === "") return "N/A";
    return `${value}${unit}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const location = locationInput.trim();

    if (!location) {
      setError("Zadejte prosím lokalitu.");
      setWeatherData(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await callApi(() => api.getWeatherForecast(location));
      setWeatherData(response);
      setSelectedLocation(location);
    } catch (err) {
      setWeatherData(null);
      setError(err.message || "Nepodařilo se načíst data počasí.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content weather-page">
      <UserBar />
      <h1>Předpověď počasí</h1>

      <form className="weather-search-form" onSubmit={handleSubmit}>
        <label htmlFor="weather-location">Lokalita</label>
        <input
          id="weather-location"
          type="text"
          placeholder="Např. Prague, Brno, Ostrava"
          value={locationInput}
          onChange={(event) => setLocationInput(event.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Načítám..." : "Načíst počasí"}
        </button>
      </form>

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

          {dailyForecast.length > 0 && (
            <div className="weather-forecast">
              <h2>Denní předpověď</h2>
              <div className="weather-day-grid">
                {dailyForecast.slice(0, 7).map((day, index) => (
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

          {!currentWeather && dailyForecast.length === 0 && (
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
