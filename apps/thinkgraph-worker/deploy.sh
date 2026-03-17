#!/usr/bin/env bash
# Deploy thinkgraph-worker to Raspberry Pi
# Usage: ./deploy.sh [pi-host]
#
# Prerequisites:
#   - SSH key access to Pi
#   - Node.js 22 installed on Pi via nvm
#   - Initial clone done: git clone <repo> /home/pi/nuxt-crouton

set -euo pipefail

PI_HOST="${1:-pi@raspberrypi.local}"
REMOTE_DIR="/home/pi/nuxt-crouton"
WORKER_DIR="$REMOTE_DIR/apps/thinkgraph-worker"

echo "=== Deploying ThinkGraph Worker to $PI_HOST ==="

# Pull latest code
echo "Pulling latest code..."
ssh "$PI_HOST" "cd $REMOTE_DIR && git pull"

# Install dependencies and build
echo "Installing dependencies..."
ssh "$PI_HOST" "cd $WORKER_DIR && ~/.nvm/versions/node/v22/bin/npm install --production"

echo "Building..."
ssh "$PI_HOST" "cd $WORKER_DIR && ~/.nvm/versions/node/v22/bin/npx tsc"

# Install systemd service if not present
echo "Updating systemd service..."
ssh "$PI_HOST" "sudo cp $WORKER_DIR/thinkgraph-worker.service /etc/systemd/system/ && sudo systemctl daemon-reload"

# Restart
echo "Restarting service..."
ssh "$PI_HOST" "sudo systemctl restart thinkgraph-worker"

# Check status
echo ""
echo "Service status:"
ssh "$PI_HOST" "sudo systemctl status thinkgraph-worker --no-pager -l" || true

echo ""
echo "=== Deploy complete ==="
