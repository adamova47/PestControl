import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

# garden location
LOCATION_ID = 1
LATITUDE = 48.22
LONGITUDE = 18.60
TIMEZONE = "Europe/Bratislava"

# forecast settings
FORECAST_DAYS = 7
REQUEST_TIMEOUT_SECONDS = 10

# Keep a forecast in memory for 15 minutes
FORECAST_CACHE_SECONDS = 900