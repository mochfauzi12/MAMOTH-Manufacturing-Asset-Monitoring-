#!/bin/sh
set -e

# Run migrations if database is ready
echo "Running Prisma migrations..."
prisma db push --accept-data-loss

echo "Starting application..."
exec "$@"
