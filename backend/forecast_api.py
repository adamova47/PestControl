import time
import logging
from datetime import datetime, timezone

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

from backend.config import (
    LATITUDE,
    LONGITUDE,
    TIMEZONE,
    FORECAST_DAYS,
    REQUEST_TIMEOUT_SECONDS,
    FORECAST_CACHE_SECONDS,
    FRONTEND_ORIGINS,
    MIN_REFRESH_INTERVAL_SECONDS,
)

# creates the web app
app = FastAPI(title="PestControl Weather API")

# allows the local Vite frontend to call this API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Open-Meteo variables we will want
HOURLY_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "precipitation_probability",
    "wind_speed_10m",
    "wind_gusts_10m",
    "weather_code",
]

DAILY_VARIABLES = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "precipitation_sum",
    "precipitation_hours",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "sunrise",
    "sunset",
]

CURRENT_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "wind_gusts_10m",
]


# in-memory cache: stores the last forecast and when it expires
_cached_forecast = None
_cache_expires_at = 0
_last_refresh_at = 0.0


# function fetches a fresh forecast from Open-Meteo
def fetch_forecast():
    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "timezone": TIMEZONE,
        "forecast_days": FORECAST_DAYS,
        "current": CURRENT_VARIABLES,
        "hourly": HOURLY_VARIABLES,
        "daily": DAILY_VARIABLES,
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        try:
            response.raise_for_status()
        except requests.HTTPError:
            print("Open-Meteo error:", response.text)
            raise
        data = response.json()

        # check that the response contains the expected keys
        if not all(key in data for key in ("current", "hourly", "daily")):
            raise HTTPException(
                status_code=502,
                detail="Open-Meteo returned incomplete forecast data.",
            )

    except requests.RequestException as error:
        logger.exception("Open-Meteo request failed")  # NEW: logs the full traceback

        # Existing behavior: keep returning a generic error to the frontend
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve weather data from Open-Meteo.",
        ) from error

    except ValueError as error:
        # handle a response that cannot be decoded as JSON
        raise HTTPException(
            status_code=502,
            detail="Open-Meteo returned an invalid response.",
        ) from error

    return {
        "location": {
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "timezone": TIMEZONE,
        },
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "current": data["current"],
        "hourly": data["hourly"],
        "daily": data["daily"],
    }


# returns a cached forecast, or fetch a new one when needed
def get_forecast(force_refresh=False):
    global _cached_forecast, _cache_expires_at

    # reuse the cache unless a refresh was requested
    if (
        not force_refresh
        and _cached_forecast is not None
        and time.monotonic() < _cache_expires_at
    ):
        return _cached_forecast

    # fetches fresh data and replace the cache
    forecast = fetch_forecast()
    _cached_forecast = forecast
    _cache_expires_at = time.monotonic() + FORECAST_CACHE_SECONDS

    return forecast


# get the current cached forecast or fetch one
@app.get("/api/forecast")
def read_forecast():
    return get_forecast()


# forces a fresh Open-Meteo request and update the cache
@app.post("/api/forecast/refresh")
def refresh_forecast():
    global _last_refresh_at

    # prevent repeated manual refreshes from triggering an upstream request more frequently than the configured interval
    now = time.monotonic()
    if now - _last_refresh_at < MIN_REFRESH_INTERVAL_SECONDS:
        raise HTTPException(
            status_code=429,
            detail="Please wait a little before refreshing again.",
        )

    # record the time of this refresh and fetch a new forecast
    _last_refresh_at = now
    return get_forecast(force_refresh=True)


@app.get("/healthz")
def health_check():
    return {"status": "ok"}