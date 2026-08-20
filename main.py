import sys
from app.config import LOCATION_ID, LATITUDE, LONGITUDE
from app.weather import run_daily_weather_update, get_weather_data
from app.observations import run_observations_update


if __name__ == "__main__":
    try:
        print(get_weather_data(LATITUDE, LONGITUDE))
        # run_observations_update()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)