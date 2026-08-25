#!/bin/bash
# Load .env and start the standalone server
set -a
source .env
set +a
exec node .next/standalone/server.js
