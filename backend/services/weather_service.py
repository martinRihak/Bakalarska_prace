
from datetime import date, datetime, timezone

import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry


class WeatherService:
    _cache_session = requests_cache.CachedSession(".cache", expire_after=3600)
    _retry_session = retry(_cache_session, retries=5, backoff_factor=0.2)
    _openmeteo = openmeteo_requests.Client(session=_retry_session)

    _forecast_url = "https://api.open-meteo.com/v1/forecast"
    _archive_url = "https://archive-api.open-meteo.com/v1/archive"

    @staticmethod
    def _to_float(value, decimals=1):
        return round(float(value), decimals)

    @staticmethod
    def _to_text(value):
        if isinstance(value, (bytes, bytearray)):
            return value.decode("utf-8", errors="replace")
        if value is None:
            return None
        return str(value)

    @staticmethod
    def _numpy_to_number_list(values, decimals=1):
        return [round(float(item), decimals) for item in values]

    @staticmethod
    def _parse_date(value, field):
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except (TypeError, ValueError) as error:
            raise ValueError(f"{field} must be in YYYY-MM-DD format.") from error

    @classmethod
    def get_weather(cls, latitude, longitude, location_name, start_date, end_date):
        latitude = float(latitude)
        longitude = float(longitude)

        start = cls._parse_date(start_date, "startDate")
        end = cls._parse_date(end_date, "endDate")
        if end < start:
            raise ValueError("endDate must be on or after startDate.")

        today = date.today()
        use_archive = end < today

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": [
                "sunrise",
                "sunset",
                "temperature_2m_max",
                "daylight_duration",
                "temperature_2m_min",
            ],
            "hourly": ["relative_humidity_2m", "temperature_2m"],
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "timezone": "auto",
        }

        url = cls._archive_url if use_archive else cls._forecast_url

        try:
            responses = cls._openmeteo.weather_api(url, params=params)
        except Exception as error:
            raise RuntimeError("Open-Meteo forecast service is unavailable.") from error

        if not responses:
            raise RuntimeError("Open-Meteo nevrátil žádná data.")

        response = responses[0]

        # Hourly data. The order of variables needs to be the same as requested.
        hourly = response.Hourly()
        hourly_relative_humidity_2m = hourly.Variables(0).ValuesAsNumpy()
        hourly_temperature_2m = hourly.Variables(1).ValuesAsNumpy()

        hourly_dates = pd.date_range(
            start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
            end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=hourly.Interval()),
            inclusive="left",
        ).strftime("%Y-%m-%dT%H:%M").tolist()

        # Daily data. The order of variables needs to be the same as requested.
        daily = response.Daily()
        daily_sunrise = daily.Variables(0).ValuesInt64AsNumpy()
        daily_sunset = daily.Variables(1).ValuesInt64AsNumpy()
        daily_temperature_2m_max = daily.Variables(2).ValuesAsNumpy()
        daily_daylight_duration = daily.Variables(3).ValuesAsNumpy()
        daily_temperature_2m_min = daily.Variables(4).ValuesAsNumpy()

        daily_dates = pd.date_range(
            start=pd.to_datetime(daily.Time(), unit="s", utc=True),
            end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=daily.Interval()),
            inclusive="left",
        ).strftime("%Y-%m-%d").tolist()

        sunrise_iso = [
            datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
            for ts in daily_sunrise
        ]
        sunset_iso = [
            datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
            for ts in daily_sunset
        ]

        result = {
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
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "daily": {
                "time": daily_dates,
                "sunrise": sunrise_iso,
                "sunset": sunset_iso,
                "temperature_2m_max": cls._numpy_to_number_list(daily_temperature_2m_max),
                "daylight_duration": cls._numpy_to_number_list(daily_daylight_duration),
                "temperature_2m_min": cls._numpy_to_number_list(daily_temperature_2m_min),
            },
            "hourly": {
                "time": hourly_dates,
                "relative_humidity_2m": cls._numpy_to_number_list(hourly_relative_humidity_2m),
                "temperature_2m": cls._numpy_to_number_list(hourly_temperature_2m),
            },
        }
        
        return result
