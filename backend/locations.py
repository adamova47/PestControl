def get_locations(cursor):
    cursor.execute("select id, latitude, longitude from locations;")
    columns = ["id", "latitude", "longitude"]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
