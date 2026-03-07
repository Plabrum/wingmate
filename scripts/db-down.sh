#!/bin/zsh
set -e
cd "$(dirname "$0")/.."

echo "==> Stopping local Supabase..."
supabase stop

echo "==> Stopping Colima..."
colima stop

echo "Done."
