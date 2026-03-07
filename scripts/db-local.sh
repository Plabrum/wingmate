#!/bin/zsh
set -e

cd "$(dirname "$0")/.."

echo "==> Ensuring Colima is running..."
if ! colima status 2>/dev/null | grep -q "running"; then
  colima start
fi

echo "==> Starting local Supabase..."
if supabase status 2>/dev/null | grep -q "supabase local development setup is running"; then
  echo "   Already running, restarting for clean state..."
  supabase stop
  supabase start
else
  supabase start
fi

echo "==> Applying migrations..."
supabase db reset

echo "==> Generating types..."
npm run db:types

echo ""
echo "Local DB ready."
echo "To start edge functions: supabase functions serve"
