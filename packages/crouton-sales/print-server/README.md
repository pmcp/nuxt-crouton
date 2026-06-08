# On-location print spooler (Teltonika RUT-series)

Recovery-ready deployment artifacts for the crouton-sales print pipeline on a
Teltonika RUT956 (or similar RutOS/BusyBox router). These files let you rebuild
the router side from scratch if the device is reset.

| File | Goes to | Purpose |
|------|---------|---------|
| `teltonika-simple-spooler-fast.sh` | `/root/` on the router | The polling spooler (decode + print + callback) |
| `print_server.init` | `/etc/init.d/print_server` | procd boot service (autostart + respawn) |

## How it works

The spooler runs **on the router** and only makes **outbound** calls — so the
hosted app stays public and the printers stay on a private LAN. No port
forwarding, no inbound exposure.

```
[app on Cloudflare Pages]  ◄─ HTTPS over 5G/WAN ─►  [RUT956]  ◄─ LAN ─►  [printer :9100]
   (public)                                       spooler runs here      (private, static IP)
```

1. POS order is placed → app generates a print job per printer (base64 ESC/POS) in D1.
2. Spooler polls `GET /api/print-server/events/{EVENT_ID}/jobs?mark_as_printing=true`.
3. Decodes the base64, streams the raw bytes to `printerIp:9100` via `nc`.
4. Calls back `POST /api/print-server/jobs/{id}/complete` (or `/fail`).

## Network topology (validated)

- **`br-lan` 192.168.1.1/24** — the RUT956's own LAN (its ethernet ports + wifi).
  Printers live here with **static IPs** (e.g. `192.168.1.72`).
- **WAN** — 5G SIM (on-location), or an ethernet uplink for bench testing.
- Printers must be on the RUT956's LAN so the spooler can reach them when the
  router is on 5G with no other network.

## Install / recover

```sh
# 1. copy the spooler script onto the router
scp teltonika-simple-spooler-fast.sh root@<router-ip>:/root/

# 2. copy + configure the boot service
scp print_server.init root@<router-ip>:/etc/init.d/print_server
ssh root@<router-ip>
vi /etc/init.d/print_server     # set API_URL, EVENT_ID, API_KEY (see below)
chmod +x /etc/init.d/print_server
/etc/init.d/print_server enable
/etc/init.d/print_server start
```

If you can't `scp` (no password handy), `cat > /root/teltonika-simple-spooler-fast.sh`
and paste — **but** beware terminals that add leading spaces on paste: a shebang
or heredoc delimiter with leading whitespace will break. For small config edits,
prefer an in-place `sed` over re-pasting the whole file:

```sh
sed -i 's#API_URL=old#API_URL=https://your-app.pages.dev#; s#EVENT_ID=old#EVENT_ID=new#' /etc/init.d/print_server
/etc/init.d/print_server restart
```

## Configuration

Set in `/etc/init.d/print_server` under `procd_set_param env`:

| Var | Value |
|-----|-------|
| `API_URL` | Base URL of the hosted app, e.g. `https://fanfare.pages.dev` |
| `API_KEY` | **Must match** the app secret `NUXT_CROUTON_SALES_PRINT_API_KEY` |
| `EVENT_ID` | The current sales event's id (per-event — see caveat) |

> The API key is a secret and is **not** stored in this repo. Set it on the
> deployment with `wrangler pages secret put NUXT_CROUTON_SALES_PRINT_API_KEY`
> and use the same value here.

### ⚠️ EVENT_ID is per-event

The spooler polls **one** event. For each new event, update `EVENT_ID` and
`/etc/init.d/print_server restart`. (A future improvement could poll all active
events instead.)

## Finding the printer IP

The Epson TM-m30 prints its IP on power-on, or set a static IP in its web UI.
From the router:

```sh
cat /tmp/dhcp.leases               # DHCP clients on br-lan (empty if static)
ip neigh show dev br-lan           # ARP neighbours
```

Enter that IP (port `9100`) in the printer record in the admin UI.

## Verifying / troubleshooting

```sh
# is the service running?
ps w | grep teltonika | grep -v grep
logread -e print_server | tail -20          # or: logread -f

# uplink leg: can the router reach the app over TLS? (expect [] and exit 0)
curl -s -H "x-api-key: $KEY" "https://your-app.pages.dev/api/print-server/events/$EV/jobs"; echo " exit $?"

# printer leg: raw ESC/POS test print (init + text + feed + cut)
printf '\x1b\x40router -> printer OK\n\n\n\x1d\x56\x41\x10' | nc 192.168.1.72 9100
```

### Gotchas learned in the field

- **No `base64` applet** on the minimal BusyBox build — the spooler uses a
  pure-awk decoder (BusyBox awk is byte-safe, so 8-bit ESC/POS survives).
- **`nc` is the minimal variant** (`nc IP PORT` only, no `-z`). Test connectivity
  by actually sending bytes, not `nc -z`.
- **TLS works** out of the box on RutOS `curl` (CA bundle present) — no `-k` needed.
- **Default config is for old local dev** (`192.168.1.214:3000`, key `1234`) —
  always confirm the env in `/etc/init.d/print_server` points at production.
- **Two spoolers race**: if you launch one manually while the boot service runs,
  both poll and `mark_as_printing` collides. Run only the service.