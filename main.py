import sys
from app.weather import run_daily_weather_update


if __name__ == "__main__":
    try:
        run_daily_weather_update()
        print("Daily weather update completed successfully.")
    except Exception as e:
        print(f"Error running daily weather update: {e}")
        sys.exit(1)