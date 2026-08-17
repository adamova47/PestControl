import requests
from app.config import LOCATION_ID, LATITUDE, LONGITUDE
from app.db import get_connection


DAILY_VARIABLES = [
    "weather_code", "temperature_2m_max", "temperature_2m_min",
    "temperature_2m_mean", "sunrise", "sunset", "daylight_duration",
    "sunshine_duration", "precipitation_sum", "precipitation_hours",
    "wind_speed_10m_max", "wind_gusts_10m_max",
    "et0_fao_evapotranspiration", "leaf_wetness_probability_mean",
    "cloud_cover_mean", "relative_humidity_2m_mean", "dew_point_2m_mean",
]


def get_weather_data(latitude, longitude):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": DAILY_VARIABLES,
        "past_days": 1,
        "forecast_days": 1,
        "timezone": "auto",
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()["daily"]


def insert_weather_row(cursor, location_id, daily, i):
    """Inserts a single day's row (index i) from the daily arrays."""
    cursor.execute("""
        insert into weather (
            location_id, date, weather_code, temp_max, temp_min, temp_mean,
            sunrise, sunset, daylight_duration, sunshine_duration,
            precipitation_sum, precipitation_hours, wind_speed_max, wind_gusts_max,
            reference_evapotranspiration, leaf_wetness_probability_mean,
            cloud_cover_mean, humidity_mean, dewpoint_mean
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        on conflict (location_id, date) do nothing;
    """, (
        location_id, daily["time"][i], daily["weather_code"][i],
        daily["temperature_2m_max"][i], daily["temperature_2m_min"][i],
        daily["temperature_2m_mean"][i], daily["sunrise"][i], daily["sunset"][i],
        daily["daylight_duration"][i], daily["sunshine_duration"][i],
        daily["precipitation_sum"][i], daily["precipitation_hours"][i],
        daily["wind_speed_10m_max"][i], daily["wind_gusts_10m_max"][i],
        daily["et0_fao_evapotranspiration"][i], daily["leaf_wetness_probability_mean"][i],
        daily["cloud_cover_mean"][i], daily["relative_humidity_2m_mean"][i],
        daily["dew_point_2m_mean"][i],
    ))


def run_daily_weather_update():
    daily = get_weather_data(LATITUDE, LONGITUDE)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        insert_weather_row(cursor, LOCATION_ID, daily, 0)
        conn.commit()
    except Exception as e:
        print(f"Error inserting weather data: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_daily_weather_update()