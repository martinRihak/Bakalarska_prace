
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

        span_days = (end - start).days + 1
        use_hourly = span_days <= 3

        today = date.today()
        use_archive = end < today

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "daily": [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
            ],
            "timezone": "auto",
        }

        if use_hourly:
            params["hourly"] = ["temperature_2m", "precipitation", "weather_code"]

        if not use_archive:
            params["current"] = [
                "temperature_2m",
                "wind_speed_10m",
                "wind_direction_10m",
                "weather_code",
            ]

        url = cls._archive_url if use_archive else cls._forecast_url

        try:
            responses = cls._openmeteo.weather_api(url, params=params)
        except Exception as error:
            raise RuntimeError("Open-Meteo forecast service is unavailable.") from error

        if not responses:
            raise RuntimeError("Open-Meteo nevrátil žádná data.")

        response = responses[0]
        daily = response.Daily()

        daily_dates = pd.date_range(
            start=pd.to_datetime(daily.Time(), unit="s", utc=True),
            end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=daily.Interval()),
            inclusive="left",
        ).strftime("%Y-%m-%d").tolist()

        current = None
        current_weather = None
        if not use_archive:
            current = response.Current()
            current_time_iso = datetime.fromtimestamp(
                current.Time(),
                tz=timezone.utc,
            ).isoformat()
            current_weather = {
                "time": current_time_iso,
                "temperature": cls._to_float(current.Variables(0).Value()),
                "windspeed": cls._to_float(current.Variables(1).Value()),
                "winddirection": cls._to_float(current.Variables(2).Value()),
                "weathercode": cls._to_int(current.Variables(3).Value()),
            }

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
            "current_weather": current_weather,
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

        if use_hourly:
            hourly = response.Hourly()
            hourly_dates = pd.date_range(
                start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
                end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
                freq=pd.Timedelta(seconds=hourly.Interval()),
                inclusive="left",
            ).strftime("%Y-%m-%dT%H:%M").tolist()

            result["hourly"] = {
                "time": hourly_dates,
                "temperature_2m": cls._numpy_to_number_list(
                    hourly.Variables(0).ValuesAsNumpy()
                ),
                "precipitation": cls._numpy_to_number_list(
                    hourly.Variables(1).ValuesAsNumpy()
                ),
                "weather_code": cls._numpy_to_number_list(
                    hourly.Variables(2).ValuesAsNumpy(),
                    as_int=True,
                ),
            }
#        print(result)
        return result
