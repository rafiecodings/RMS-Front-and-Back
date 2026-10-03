#!/bin/sh
set -e

# Fail early with a clear message when required runtime config is missing.
# HostForge must provide these as environment variables (see DEPLOY.md).
if [ -z "$APP_KEY" ]; then
  echo "ERROR: APP_KEY is empty. Set APP_KEY for the backend container." >&2
  exit 1
fi
if [ -z "$DB_HOST" ]; then
  echo "ERROR: DB_HOST is empty. Set DB_HOST for the backend container." >&2
  exit 1
fi
if [ -z "$DB_DATABASE" ]; then
  echo "ERROR: DB_DATABASE is empty. Set DB_DATABASE for the backend container." >&2
  exit 1
fi
if [ -z "$DB_USERNAME" ]; then
  echo "ERROR: DB_USERNAME is empty. Set DB_USERNAME for the backend container." >&2
  exit 1
fi
if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: DB_PASSWORD is empty. Set DB_PASSWORD for the backend container." >&2
  exit 1
fi

# Ensure the public/storage symlink exists at boot (HostForge persistent
# volume is mounted at storage/app/public; fresh clones/redeploys lose the link).
ln -sfn /var/www/storage/app/public /var/www/public/storage || true


# Seed the production admin only when credentials are provided; otherwise skip
# instead of failing the boot (ProductionBootstrapSeeder warns and skips too).


exec php artisan serve --host=0.0.0.0 --port=${PORT:-10000}
