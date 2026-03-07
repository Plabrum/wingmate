#!/bin/bash
set -e

TMPENV=$(mktemp /tmp/.env.ota.XXXXXX)

# Temporarily hide .env.local so Expo doesn't load local values
if [ -f .env.local ]; then
  mv .env.local .env.local.bak
  trap "mv .env.local.bak .env.local; rm -f $TMPENV" EXIT
else
  trap "rm -f $TMPENV" EXIT
fi

echo "Pulling production env vars from EAS..."
eas env:pull --environment production --path "$TMPENV" --non-interactive

set -a
source "$TMPENV"
set +a

echo "Pushing OTA update..."
eas update --channel production --platform ios --message "${1:-ota update}"
