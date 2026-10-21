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

# keep a forecast in memory for 15 minutes
FORECAST_CACHE_SECONDS = 900

# only allow configured website origins to call the API from a browser
# FRONTEND_ORIGINS is going to be a comma-separated list in the deployment settings
FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

# prevent repeated manual refreshes from triggering an upstream request
# more frequently than this interval
MIN_REFRESH_INTERVAL_SECONDS = 30

"""
The cooldown will be a small safeguard against API abuse. It will apply per Python process so it can still be bypassed 
by running multiple processes, but it will prevent a single process from hammering the upstream API with repeated refreshes. 
The frontend will also be rate-limited to prevent abuse, but this is an additional safeguard on the backend.
"""