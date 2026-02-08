#!/bin/bash
# Apply database migrations if any (assuming alembic is used)
# alembic upgrade head

# Start Gunicorn with Uvicorn workers
exec gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
