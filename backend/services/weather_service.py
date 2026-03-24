
from datetime import datetime, timezone

import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry


class WeatherService:
    _cache_session = requests_cache.CachedSession(".cache", expire_after=3600)
    _retry_session = retry(_cache_session, retries=5, backoff_factor=0.2)
    _openmeteo = openmeteo_requests.Client(session=_retry_session)

    _forecast_url = "https://api.open-meteo.com/v1/forecast"

    @staticmethod
    def _to_float(value, decimals=1):
        return round(float(value), decimals)

    @staticmethod
    def _to_int(value):
        return int(round(float(value)))

    @staticmethod
    def _to_text(value):
        if isinstance(value, (bytes, bytearray)):
            return value.decode("utf-8", errors="replace")
        if value is None:
            return None
        return str(value)

    @staticmethod
    def _numpy_to_number_list(values, decimals=1, as_int=False):
        result = []
        for item in values:
            if as_int:
                result.append(int(round(float(item))))
            else:
                result.append(round(float(item), decimals))
        return result

    @classmethod
    def get_weather(cls, latitude, longitude, location_name=None):
        latitude = float(latitude)
        longitude = float(longitude)
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": [
                "temperature_2m",
                "wind_speed_10m",
                "wind_direction_10m",
                "weather_code",
            ],
            "daily": [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
            ],
            "timezone": "auto",
        }

        try:
            responses = cls._openmeteo.weather_api(cls._forecast_url, params=params)
        except Exception as error:
            raise RuntimeError("Open-Meteo forecast service is unavailable.") from error

        if not responses:
            raise RuntimeError("Open-Meteo nevrátil žádná data.")

        response = responses[0]
        current = response.Current()
        daily = response.Daily()

        daily_dates = pd.date_range(
            start=pd.to_datetime(daily.Time(), unit="s", utc=True),
            end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=daily.Interval()),
            inclusive="left",
        ).strftime("%Y-%m-%d").tolist()

        current_time_iso = datetime.fromtimestamp(
            current.Time(),
            tz=timezone.utc,
        ).isoformat()

        return {
            "location": {
                "name": location_name,
                "country": None,
                "admin1": None,
                "latitude": cls._to_float(latitude, decimals=4),
                "longitude": cls._to_float(longitude, decimals=4),
                "display_name": location_name
                or f"{cls._to_float(latitude, decimals=4)}, {cls._to_float(longitude, decimals=4)}",
            },
            "timezone": cls._to_text(response.Timezone()),
            "timezone_abbreviation": cls._to_text(response.TimezoneAbbreviation()),
            "utc_offset_seconds": response.UtcOffsetSeconds(),
            "current_weather": {
                "time": current_time_iso,
                "temperature": cls._to_float(current.Variables(0).Value()),
                "windspeed": cls._to_float(current.Variables(1).Value()),
                "winddirection": cls._to_float(current.Variables(2).Value()),
                "weathercode": cls._to_int(current.Variables(3).Value()),
            },
            "daily": {
                "time": daily_dates,
                "weathercode": cls._numpy_to_number_list(
                    daily.Variables(0).ValuesAsNumpy(),
                    as_int=True,
                ),
                "temperature_2m_max": cls._numpy_to_number_list(
                    daily.Variables(1).ValuesAsNumpy()
                ),
                "temperature_2m_min": cls._numpy_to_number_list(
                    daily.Variables(2).ValuesAsNumpy()
                ),
                "precipitation_sum": cls._numpy_to_number_list(
                    daily.Variables(3).ValuesAsNumpy()
                ),
            },
        }
