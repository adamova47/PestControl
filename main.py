import sys
from backend.config import LOCATION_ID, LATITUDE, LONGITUDE
from backend.weather import run_daily_weather_update, get_weather_data
from backend.observations import run_observations_update


if __name__ == "__main__":
    try:
        print(get_weather_data(LATITUDE, LONGITUDE))
        # run_observations_update()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)