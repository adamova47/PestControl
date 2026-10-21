
FROM python:3.12-slim

# run the app from a predictable directory inside the container
WORKDIR /app

# avoid creating Python bytecode and keep logs visible in console
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# create a user to safely run the app inside the container without root privileges
RUN useradd --create-home appuser

# install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy the backend with the correct ownership so that the app can read and write files as needed
COPY --chown=appuser:appuser backend/ ./backend/

USER appuser

# oracle's container will listen on this port

# Render uses port 10000 by default; keep the app listening on the public web-service port
EXPOSE 10000

# use Render's PORT setting, falling back to 10000 for local Docker runs.
CMD ["sh", "-c", "uvicorn backend.forecast_api:app --host 0.0.0.0 --port ${PORT:-10000}"]
