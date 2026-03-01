#!/bin/bash
# dev-sim.sh — Rebuild dev client for simulator if native changed, then start Metro
set -e

SIM_BUILD="builds/dev-sim.app"
FP_FILE=".dev-sim-fingerprint"

get_fingerprint() {
  npx expo-updates fingerprint:generate --platform ios 2>/dev/null \
    | node -e "let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>console.log(JSON.parse(s).hash))"
}

echo "Checking for native changes..."
CURRENT=$(get_fingerprint)

if [ -z "$CURRENT" ]; then
  echo "Error: Could not generate fingerprint. Is expo-updates installed?"
  exit 1
fi

NEEDS_BUILD=false

if [ ! -d "$SIM_BUILD" ]; then
  echo "No dev client build found."
  NEEDS_BUILD=true
elif [ ! -f "$FP_FILE" ] || [ "$(cat "$FP_FILE")" != "$CURRENT" ]; then
  echo "Native changes detected — rebuilding dev client..."
  NEEDS_BUILD=true
else
  echo "Dev client is up to date."
fi

if [ "$NEEDS_BUILD" = true ]; then
  echo "Building dev client for simulator (this takes a few minutes)..."
  EAS_BUILD_NO_EXPO_GO_WARNING=true eas build \
    --platform ios \
    --profile development-simulator \
    --local \
    --output "$SIM_BUILD"

  echo "Installing on booted simulator..."
  # EAS outputs a compressed archive — extract it first
  EXTRACT_DIR="builds/dev-sim-extracted"
  rm -rf "$EXTRACT_DIR"
  mkdir -p "$EXTRACT_DIR"
  tar -xzf "$SIM_BUILD" -C "$EXTRACT_DIR"
  APP_PATH=$(find "$EXTRACT_DIR" -name "*.app" -maxdepth 1 | head -1)
  xcrun simctl install booted "$APP_PATH"
  echo "$CURRENT" > "$FP_FILE"
  echo "Dev client installed."
fi

echo ""
echo "Starting Metro bundler..."
npx expo start --dev-client
