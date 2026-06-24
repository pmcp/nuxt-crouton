#!/usr/bin/env bash
#
# One-command, idempotent setup for the fanfare local-first venue Pi (#798).
#
# Turns the ephemeral bench rig (manual tmux dev server + hand-added IP alias)
# into a reboot-survivable box:
#   * node-server production build  (with --build)
#   * systemd unit                  -> fanfare auto-starts on boot, Restart=always
#   * persistent printer-subnet route (NetworkManager, survives reboots)
#   * boot + periodic reachability health check (RUT + both printers)
#
# Safe to re-run. Needs sudo for the system-level bits (systemd, nmcli, /etc).
#
# Usage:
#   ./setup.sh            # wire everything against an existing .output build
#   ./setup.sh --build    # build the node-server bundle first, then wire
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$HERE/../.." && pwd)"          # apps/fanfare
RUN_USER="${SUDO_USER:-$(id -un)}"
ENV_FILE="/etc/fanfare/fanfare.env"

log() { echo "[setup] $*"; }

# --- resolve the node binary (nvm installs aren't on the non-interactive PATH) ---
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(ls -1 "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1 || true)"
fi
[ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ] || { echo "[setup] ERROR: could not find a node binary; set NODE_BIN=" >&2; exit 1; }
log "app dir : $APP_DIR"
log "user    : $RUN_USER"
log "node    : $NODE_BIN ($("$NODE_BIN" -v))"

# --- 1. (optional) build the node-server bundle -------------------------------
if [ "${1:-}" = "--build" ]; then
  log "building node-server bundle (NITRO_PRESET=node-server)..."
  ( cd "$APP_DIR" && PATH="$(dirname "$NODE_BIN"):$PATH" \
      NITRO_PRESET=node-server NODE_OPTIONS=--max-old-space-size=6144 pnpm build )
fi
if [ ! -f "$APP_DIR/.output/server/index.mjs" ]; then
  echo "[setup] ERROR: $APP_DIR/.output/server/index.mjs missing — run: ./setup.sh --build" >&2
  exit 1
fi

# --- 2. secrets env file ------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  log "creating $ENV_FILE"
  sudo mkdir -p "$(dirname "$ENV_FILE")"
  if [ -f "$APP_DIR/.env" ] && grep -q BETTER_AUTH_SECRET "$APP_DIR/.env"; then
    log "  seeding BETTER_AUTH_* from $APP_DIR/.env"
    sudo install -m 600 /dev/null "$ENV_FILE"
    grep -E '^BETTER_AUTH_(SECRET|URL)=' "$APP_DIR/.env" | sudo tee "$ENV_FILE" >/dev/null
  else
    log "  no app .env found — copying the example; EDIT $ENV_FILE before going live"
    sudo install -m 600 "$HERE/fanfare.env.example" "$ENV_FILE"
  fi
  sudo chmod 600 "$ENV_FILE"
else
  log "$ENV_FILE already exists — leaving it"
fi

# --- 3. render + install the systemd unit -------------------------------------
log "installing /etc/systemd/system/fanfare.service"
sed -e "s|__USER__|$RUN_USER|g" \
    -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__NODE_BIN__|$NODE_BIN|g" \
    "$HERE/fanfare.service" | sudo tee /etc/systemd/system/fanfare.service >/dev/null

# --- 4. persistent printer-subnet route ---------------------------------------
log "configuring persistent printer-subnet route (NetworkManager)"
bash "$HERE/configure-network.sh"

# --- 5. boot + periodic health check ------------------------------------------
log "installing fanfare-healthcheck.service + .timer"
sudo tee /etc/systemd/system/fanfare-healthcheck.service >/dev/null <<UNIT
[Unit]
Description=fanfare venue rig reachability check (RUT + both printers)
After=network-online.target fanfare.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$HERE/healthcheck.sh
UNIT

sudo tee /etc/systemd/system/fanfare-healthcheck.timer >/dev/null <<'UNIT'
[Unit]
Description=Run the fanfare venue rig health check at boot and every 5 minutes

[Timer]
OnBootSec=45s
OnUnitActiveSec=5min
Unit=fanfare-healthcheck.service

[Install]
WantedBy=timers.target
UNIT

# --- 6. enable + (re)start ----------------------------------------------------
log "enabling + starting units"
sudo systemctl daemon-reload
sudo systemctl enable --now fanfare.service
sudo systemctl enable --now fanfare-healthcheck.timer
sudo systemctl restart fanfare.service   # pick up a fresh build if re-run

log "done. status:"
sudo systemctl --no-pager --lines=0 status fanfare.service || true
echo
log "next: register an account + team at the venue URL, then seed the event (see README)."
log "verify the rig with: $HERE/healthcheck.sh"
