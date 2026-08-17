import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')


LATITUDE = 48.22
LONGITUDE = 18.60
TAXON_NAME = "Great tit" # Coccinellidae - Ladybug
RADIUS_KM = 10


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


def get_data_from_GBIF(latitude, longitude, taxon_key, radius_km=20):
    url = "https://api.gbif.org/v1/occurrence/search"
    params = {
        "taxonKey": taxon_key,
        "geoDistance": f"{latitude},{longitude},{radius_km}km",
        "limit": 5,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    print("Total results on GBIF:", data.get("count"))
    return data["results"]


# iNaturalist_data = get_data_from_iNaturalist(LATITUDE, LONGITUDE, 203153, RADIUS_KM)
# print(iNaturalist_data[0] if iNaturalist_data else "No data found")

# gbif_data = get_data_from_GBIF(LATITUDE, LONGITUDE, gbif_taxon_key, RADIUS_KM)
# print(gbif_data[0] if gbif_data else "No data found")