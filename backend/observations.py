import requests
import sys
from dateutil import parser as date_parser
sys.stdout.reconfigure(encoding='utf-8')

from backend.db import get_connection
from backend.species import fetch_all_species
from backend.locations import get_locations


def fetch_iNaturalist_observations(latitude, longitude, taxon_id, radius_km):
    url = "https://api.inaturalist.org/v1/observations"
    params = {
        "lat": latitude,
        "lng": longitude,
        "radius": radius_km,
        "taxon_id": taxon_id,
        "per_page": 200,
        "order_by": "observed_on",
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()["results"]


def fetch_GBIF_observations(latitude, longitude, taxon_key, radius_km=20):
    url = "https://api.gbif.org/v1/occurrence/search"
    params = {
        "taxonKey": taxon_key,
        "geoDistance": f"{latitude},{longitude},{radius_km}km",
        "limit": 100,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()["results"]


def parse_iNat_date(date_str):
    if not date_str:
        return None
    try:
        return date_parser.parse(date_str)
    except Exception as _:
        print(f"Could not parse the iNaturalist date: {date_str}")
        return None


def normalize_iNaturalist_observations(observation):
    return {
        "observed_date": observation.get("observed_on"),
        "observed_at": parse_iNat_date(observation.get("observed_on_string")),
        "latitude": observation["geojson"]["coordinates"][1] if observation.get("geojson") else None,
        "longitude": observation["geojson"]["coordinates"][0] if observation.get("geojson") else None,
        "source": "iNaturalist",
        "source_id": observation.get("id"),
        "count": None,
        "life_stage": None,
        "notes": observation.get("description"),
    }


def normalize_GBIF_observations(observation):
    return {
        "observed_date": observation.get("eventDate"),
        "observed_at": None,
        "latitude": observation.get("decimalLatitude"),
        "longitude": observation.get("decimalLongitude"),
        "source": "GBIF",
        "source_id": observation.get("gbifID"),
        "count": observation.get("individualCount"),
        "life_stage": observation.get("lifeStage"),
        "notes": observation.get("occurrenceRemarks"),
    }


def insert_observation_into_db(cursor, species_id, location_id, observation):
    if observation["observed_date"] is None:
        return
    cursor.execute(
        """
        insert into observations (species_id, location_id, observed_date, observed_at, latitude, longitude, source, source_id, count, life_stage, notes)
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        on conflict (source, source_id) do nothing
        """,
        (
            species_id,
            location_id,
            observation.get("observed_date"),
            observation.get("observed_at"),
            observation.get("latitude"),
            observation.get("longitude"),
            observation.get("source"),
            observation.get("source_id"),
            observation.get("count"),
            observation.get("life_stage"),
            observation.get("notes"),
        ),
    )


def run_observations_update():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        species_list = fetch_all_species(cursor)
        locations = get_locations(cursor)

        for species in species_list:
            for location in locations:
                latitude, longitude, species_radius = location.get("latitude"), location.get("longitude"), species.get("search_radius_km")

                if species.get("inaturalist_taxon_id"):
                    inat_observations = fetch_iNaturalist_observations(latitude, longitude, species.get("inaturalist_taxon_id"), species_radius)
                    for obs in inat_observations:
                        normalized_obs = normalize_iNaturalist_observations(obs)
                        insert_observation_into_db(cursor, species.get("id"), location.get("id"), normalized_obs)
                    print(f"Fetched {len(inat_observations)} iNaturalist observations for {species.get('name')} at location ({latitude}, {longitude})")
                if species.get("gbif_taxon_key"):
                    gbif_observations = fetch_GBIF_observations(latitude, longitude, species.get("gbif_taxon_key"), species_radius)
                    for obs in gbif_observations:
                        normalized_obs = normalize_GBIF_observations(obs)
                        insert_observation_into_db(cursor, species.get("id"), location.get("id"), normalized_obs)
                    print(f"Fetched {len(gbif_observations)} GBIF observations for {species.get('name')} at location ({latitude}, {longitude})")

        conn.commit()
        print("Observations update completed.")

    except Exception as e:
        conn.rollback()
        print(f"Error during observations update: {e}")
    finally:
        cursor.close()
        conn.close()
