# Config section - things you need per location
LATITUDE = 48.289
LONGITUDE = 18.600
TAXON_NAME = "Great tit" # Coccinellidae - Ladybug
RADIUS_KM = 20

import requests

"""
Windows terminal encoding (which is cp1252) cant display certain characters - like \u013e
which is ľ. The terminals default is an older character set. Thats why we force the UTF-8 encoding.
We can do this solely in terminal using: $env:PYTHONIOENCODING="utf-8" or
PowerShell: set PYTHONIOENCODING=utf-8
but since this is probably going to be a problem of every session we just did it permanently in the
code.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

"""
Fetches the current weather data for the given latitude and longitude using the Open-Meteo API.
"""
def get_weather_data(latitude, longitude):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ["temperature_2m", "wind_speed_10m", "wind_direction_10m", "weather_code"],
    }
    response = requests.get(url, params=params)
    data = response.json()
    return data["current"]  


def find_taxon_id(taxon_name):
    url = "https://api.inaturalist.org/v1/taxa"
    params = {
        "q": taxon_name,
        "per_page": 3,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    for result in data["results"]:
        print(result["id"], "-", result["name"], "-", result.get("preferred_common_name"))


def get_data_from_iNaturalist(latitude, longitude, taxon_id, radius_km=20):
    url = "https://api.inaturalist.org/v1/observations"
    params = {
        "lat": latitude,
        "lng": longitude,
        "radius": radius_km,
        "taxon_id": taxon_id,
        "per_page": 20,
        "order_by": "observed_on",
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    print("Total results on iNaturalist:", data.get("total_results"))
    return data["results"]


def find_GBIF_taxon_id(name):
    url = "https://api.gbif.org/v1/species/match"
    params = {"name": name}
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    return data.get("usageKey")


def get_data_from_GBIF(latitude, longitude, taxon_key, radius_km=20):
    url = "https://api.gbif.org/v1/occurrence/search"
    params = {
        "taxonKey": taxon_key,
        "geoDistance": f"{latitude},{longitude},{radius_km}km",
        "limit": 20,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    print("Total results on GBIF:", data.get("count"))
    return data["results"]


weather_data = get_weather_data(LATITUDE, LONGITUDE)
print(weather_data)

# find_taxon_id(TAXON_NAME)
# iNaturalist_data = get_data_from_iNaturalist(LATITUDE, LONGITUDE, 203153, RADIUS_KM)
# print(iNaturalist_data[0] if iNaturalist_data else "No data found")

# gbif_taxon_key = find_GBIF_taxon_id(TAXON_NAME)
# gbif_data = get_data_from_GBIF(LATITUDE, LONGITUDE, gbif_taxon_key, RADIUS_KM)
# print(gbif_data[0] if gbif_data else "No data found")