#!/bin/zsh
set -e
cd "$(dirname "$0")/.."

echo "==> Resetting database (applying all migrations)..."
supabase db reset

echo "==> Generating types..."
npm run db:types

echo "Database reset complete."
