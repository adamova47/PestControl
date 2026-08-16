import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
LOCATION_ID = 1
LATITUDE = 48.22
LONGITUDE = 18.60