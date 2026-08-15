import os

import psycopg
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL was not found.")

with psycopg.connect(database_url) as connection:
    print("Successfully connected to PostgreSQL!")