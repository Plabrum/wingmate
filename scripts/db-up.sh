#!/bin/zsh
set -e
cd "$(dirname "$0")/.."

echo "==> Ensuring Colima is running..."
if ! colima status 2>/dev/null | grep -q "running"; then
  colima start
fi

echo "==> Ensuring local Supabase is running..."
if ! supabase status 2>/dev/null | grep -q "API URL"; then
  supabase start
fi

echo "==> Applying migrations..."
supabase db push

echo "==> Generating types..."
npm run db:types

echo "Local Supabase is up."
supabase status
