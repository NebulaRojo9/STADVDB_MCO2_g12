#!/usr/bin/env bash
set -e  # Exit immediately if a command exits with a non-zero status

FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
DIST_DIR="$FRONTEND_DIR/dist"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: Directory '$FRONTEND_DIR' not found."
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Error: Directory '$BACKEND_DIR' not found."
  exit 1
fi

echo "Building frontend..."
cd "$FRONTEND_DIR"
npm run build
cd ..
echo "Build complete. moving artifacts..."

# Clean old build
if [ -d "$BACKEND_DIR/dist" ]; then
    echo "Removing old dist folder..."
    rm -rf "$BACKEND_DIR/dist"
fi

# Copy new build
echo "Copying dist/ to backend..."
cp -r "$DIST_DIR" "$BACKEND_DIR/"

echo "Frontend successfully deployed to $BACKEND_DIR/dist"