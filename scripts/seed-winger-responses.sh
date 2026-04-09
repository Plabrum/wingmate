#!/bin/zsh
set -e
cd "$(dirname "$0")/.."

echo "==> Loading local Supabase credentials..."

JWT_KEYS=$(docker exec supabase_auth_wingmate env 2>/dev/null | grep '^GOTRUE_JWT_KEYS=' | cut -d'=' -f2-)
JWT_SECRET=$(docker exec supabase_auth_wingmate env 2>/dev/null | grep '^GOTRUE_JWT_SECRET=' | cut -d'=' -f2-)

if [ -z "$JWT_KEYS" ] && [ -z "$JWT_SECRET" ]; then
  echo "Error: Could not read JWT config from auth container. Is Supabase running?"
  exit 1
fi

echo "==> Seeding winger prompt responses..."
SUPABASE_URL=http://127.0.0.1:54321 \
GOTRUE_JWT_KEYS="$JWT_KEYS" \
GOTRUE_JWT_SECRET="$JWT_SECRET" \
  npx tsx scripts/seed-winger-responses.ts

echo "Done."
