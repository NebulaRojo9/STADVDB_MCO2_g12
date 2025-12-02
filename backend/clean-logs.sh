#!/bin/bash

# Go to the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Navigate to ./logs
cd "$SCRIPT_DIR/logs" || exit 1

# Delete all .log files
rm -f *.log

echo "All .log files deleted from $(pwd)"
