# Venue Network Setup — Raspberry Pi + Teltonika RUT956

Runbook for the local-first venue rig (issue #65). Wires up the RUT956 so the Pi serves the app on the LAN, **users never consume the venue's 5G**, and only the Pi reaches the internet (for sync/backup). See `docs/architecture/venue-local-first-architecture.md` for the rationale.

## Goal

```
  Tablets/phones ──Wi-Fi──▶ Pi + printers (LAN)        POS works, no internet needed
                 ──✗ blocked at RUT firewall──▶ 5G       no surfing on venue data
        └── own cellular ──▶ internet                     user's own data

  Pi ──(allowed: static IP only)──▶ 5G ──▶ Cloudflare     constant sync / backup
  Admin ──WireGuard via RUT──▶ Pi                          manage / push updates
```

## 1. Static addressing

Give the Pi and every printer a fixed LAN IP (DHCP static lease or static config):

| Device | Example IP |
|--------|-----------|
| RUT956 (gateway) | `192.168.1.1` |
| Raspberry Pi | `192.168.1.10` |
| Kitchen printer 1 | `192.168.1.71` |
| Receipt printer | `192.168.1.72` |

RutOS: **Network → DHCP → Static Leases** — bind each MAC to its IP.

## 2. mDNS (avahi) so tablets use a name

Run Avahi on the Pi so tablets hit `https://kassa.local` instead of an IP:

```bash
sudo apt install -y avahi-daemon
sudo hostnamectl set-hostname kassa
```

## 3. Firewall — reserve the 5G for the Pi (the key step)

Block client devices from the WAN; allow only the Pi out. Two equivalent approaches:

**A. Traffic rule (simplest)** — RutOS **Network → Firewall → Traffic Rules**:
- Rule 1 — *Pi to internet (allow)*: Source LAN `192.168.1.10` → Dest WAN → **Accept**.
- Rule 2 — *Block clients to internet*: Source LAN `192.168.1.0/24` → Dest WAN → **Reject**. Order it **after** Rule 1.

**B. Guest VLAN** — put tablets on a guest Wi-Fi/VLAN with "no internet" and only LAN access to the Pi/printers; keep the Pi on the main LAN with WAN access.

UCI equivalent (A):
```
# allow the Pi out
uci add firewall rule; uci set firewall.@rule[-1].name='pi-wan'
uci set firewall.@rule[-1].src='lan'; uci set firewall.@rule[-1].dest='wan'
uci set firewall.@rule[-1].src_ip='192.168.1.10'; uci set firewall.@rule[-1].target='ACCEPT'
# block everyone else
uci add firewall rule; uci set firewall.@rule[-1].name='lan-no-wan'
uci set firewall.@rule[-1].src='lan'; uci set firewall.@rule[-1].dest='wan'
uci set firewall.@rule[-1].target='REJECT'
uci commit firewall; /etc/init.d/firewall restart
```

**Result:** the client Wi-Fi has no internet route. iOS/Android then fall back to **cellular for internet while staying on Wi-Fi for the LAN** (POS). A one-time "Wi-Fi has no Internet — stay connected?" prompt may appear; choose stay. The LAN/POS path is unaffected.

## 4. HTTPS on the LAN (Caddy on the Pi)

Secure cookies, passkeys, and PWA features need a secure context. Front the app with Caddy:

```caddyfile
# /etc/caddy/Caddyfile
kassa.local {
  reverse_proxy 127.0.0.1:3000
  tls internal          # local CA; install Caddy's root cert on the tablets
}
```

- **Local CA:** `tls internal` issues a cert from Caddy's root — install that root on each tablet (Settings → trust profile) once.
- **Real cert (alternative):** point a public hostname's DNS-01 record at the LAN IP and let Caddy get a Let's Encrypt cert (needs the Pi's egress, which is allowed).
- Set `BETTER_AUTH_URL=https://kassa.local`. If a public hostname must also work on-site, add both to `BETTER_AUTH_TRUSTED_ORIGINS` and use split-horizon DNS.

## 5. Remote admin (WireGuard)

For pushing updates / checking the Pi remotely, use the RUT's built-in WireGuard server rather than exposing any inbound port. Add an admin peer; route the LAN subnet so you reach `192.168.1.10` over the tunnel.

## Checklist

- [ ] Pi + printers on static IPs; `kassa.local` resolves on the LAN.
- [ ] Firewall: only the Pi egresses to WAN; client subnet blocked from WAN.
- [ ] A tablet on the Wi-Fi reaches the POS but uses its own cellular for the web.
- [ ] `https://kassa.local` serves with a trusted cert; login works.
- [ ] WireGuard admin access verified.
