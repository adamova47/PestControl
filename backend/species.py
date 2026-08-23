import requests
from backend.db import get_connection


def fetch_GBIF_taxon_info(name):
    url = "https://api.gbif.org/v1/species/match"
    params = {"name": name}
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    usage_key = data.get("usageKey")
    canonical_name = data.get("canonicalName")

    if usage_key is None or canonical_name is None:
        print(f"Warning: GBIF found no match for '{name}'")
        return (None, None)

    return (usage_key, canonical_name)


def fetch_iNaturalist_taxon_info(taxon_name):
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
    gbif_key, gbif_name = fetch_GBIF_taxon_info(taxon_name)

    iNaturalist_candidates = fetch_iNaturalist_taxon_info(taxon_name)

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
        "inat_id": iNat_match.get("id"),
    }


def insert_species_to_db(species_data):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
                INSERT INTO species (common_name, scientific_name, role, inaturalist_taxon_id, gbif_taxon_key, search_radius_km)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (inaturalist_taxon_id) DO NOTHING
                returning id;
            """
            ,
            (
                species_data.get("common_name"),
                species_data.get("scientific_name"),
                "predator",
                species_data.get("inat_id"),
                species_data.get("gbif_id"),
                10
            )
        )
        conn.commit()
        print(f"Inserted {species_data["common_name"]} into the database.")
    except Exception as e:
        print(f"Error inserting {species_data["common_name"]}: {e}")
    finally:
        cursor.close()
        conn.close()


def fetch_all_species(cursor):
    columns = ["id", "scientific_name", "inaturalist_taxon_id", "gbif_taxon_key", "search_radius_km"]
    cursor.execute(f"select {", ".join(columns)} from species where inaturalist_taxon_id is not null or gbif_taxon_key is not null;")
    return [dict(zip(columns, row)) for row in cursor.fetchall()]