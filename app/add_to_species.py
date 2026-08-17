import requests
from datetime import date
from app.config import LOCATION_ID, LATITUDE, LONGITUDE
from app.db import get_connection


TAXON_NAME = "Aphididae" # Coccinellidae - Ladybug


def find_GBIF_taxon_info(name):
    url = "https://api.gbif.org/v1/species/match"
    params = {"name": name}
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    usage_key = data.get("usageKey")
    scientific_name = data.get("scientificName")

    if usage_key is None or scientific_name is None:
        print(f"Warning: GBIF found no match for '{name}'")
        return (None, None)

    return (usage_key, scientific_name)


def find_iNaturalist_taxon_info(taxon_name):
    url = "https://api.inaturalist.org/v1/taxa"
    params = {
        "q": taxon_name,
        "per_page": 3,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    return data["results"]


def organize_species_data(taxon_name):
    gbif_key, gbif_name = find_GBIF_taxon_info(taxon_name)

    iNaturalist_candidates = find_iNaturalist_taxon_info(taxon_name)

    iNat_match = None
    for result in iNaturalist_candidates:
        if result["name"].lower() == gbif_name.lower():
            iNat_match = result
            break

    if iNat_match is None:
        print(f"Warning: no exact iNaturalist match found for '{gbif_name}'")
        return None

    return {
        "scientific_name": gbif_name,
        "common_name": iNat_match.get("preferred_common_name"), # iNaturalist tends to have better common names
        "gbif_id": gbif_key,
        "inat_id": iNat_match["id"],
    }


def insert_species_to_db(species_data):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
                INSERT INTO species (common_name, scientific_name, role, inaturalist_taxon_id, gbif_taxon_key)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (inaturalist_taxon_id) DO NOTHING
                returning id;
            """
            ,
            (
                species_data["common_name"],
                species_data["scientific_name"],
                "predator",
                species_data["inat_id"],
                species_data["gbif_id"],
            )
        )
        conn.commit()
        print(f"Inserted {species_data["common_name"]} into the database.")
    except Exception as e:
        print(f"Error inserting {species_data["common_name"]}: {e}")
    finally:
        cursor.close()
        conn.close()


species_data = organize_species_data(TAXON_NAME)
if species_data:
    insert_species_to_db(species_data)