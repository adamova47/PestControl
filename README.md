# PestControl

## Project concept

**End goal:**

A personal **garden intelligence and monitoring application** designed to help the user understand and manage conditions in their garden by combining external data sources, historical observations, weather information, local environmental information, and eventually AI-assisted analysis.

## What has been done so far

### Project foundation

- [x] Created the Python project structure
- [x] Split the application into separate modules for configuration, database access, locations, species, observations, and weather
- [x] Added environment-based configuration using `.env`
- [x] Connected the application to a PostgreSQL database using `psycopg`
- [x] Added project dependencies to `requirements.txt`

### Database and locations

- [x] Created and populated the database tables needed for locations, species, observations, and weather data
- [x] Added database connection handling
- [x] Added support for reading garden locations from the database
- [x] Configured the initial garden location

### Species and taxonomy

- [x] Integrated the GBIF species matching API
- [x] Integrated the iNaturalist taxonomy API
- [x] Added logic to match species between GBIF and iNaturalist
- [x] Store scientific names and common names
- [x] Store GBIF taxon keys and iNaturalist taxon IDs
- [x] Store a search radius for each species

### Biological observations

- [x] Integrated the iNaturalist observations API
- [x] Integrated the GBIF occurrence API
- [x] Added geographic-radius searches around configured locations
- [x] Added normalization of iNaturalist and GBIF observations into a common format
- [x] Store observation dates and timestamps
- [x] Store observation coordinates
- [x] Store the original data source and source ID
- [x] Store available metadata such as individual count, life stage, and notes
- [x] Added duplicate protection using `(source, source_id)`

### Weather data

- [x] Integrated the Open-Meteo archive API
- [x] Added collection of daily weather variables relevant to garden monitoring
- [x] Store daily weather data in PostgreSQL
- [x] Added duplicate protection using `(location_id, date)`
- [x] Added a daily weather update function

### Automation / DevOps

- [x] Added a GitHub Actions workflow for automated weather updates
- [x] Configured the workflow to run daily at 10:00 in the `Europe/Bratislava` timezone
- [x] Added manual workflow triggering with `workflow_dispatch`
- [x] Configured the GitHub Actions environment to install the Python dependencies and run the weather update
- [x] Passed the database connection through a GitHub Actions secret

## Current project state

The project currently has the foundations of a data pipeline: external biodiversity and weather APIs can be queried, their data can be normalized and stored in PostgreSQL, and the weather update is automated through GitHub Actions.

The project is intentionally being built incrementally. Future goals will be added to this README as they are started.

## Technology stack

- **Python**
- **PostgreSQL**
- **psycopg**
- **Requests**
- **Open-Meteo API**
- **iNaturalist API**
- **GBIF API**
- **GitHub Actions**
