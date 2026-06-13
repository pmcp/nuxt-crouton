# Litestream Backup — Pi SQLite → R2/S3

Runbook for continuous backup of the venue Pi's SQLite database (issue #64). Litestream streams the WAL to object storage every few seconds, giving point-in-time restore if the Pi/SD card dies. The Pi stays the authoritative writer; this is disaster recovery, not a live cloud mirror (see `docs/architecture/venue-local-first-architecture.md` → "Sync model").

> Scope note: this assumes the app runs on the Pi via the `node-server` target (#63) with a local SQLite file. Until that lands, this is reference config.

## Prerequisites

- SQLite in **WAL mode** (Litestream requires it):
  ```sql
  PRAGMA journal_mode = WAL;
  ```
- An R2 (or S3) bucket + credentials, set as env on the Pi:
  `LITESTREAM_ACCESS_KEY_ID`, `LITESTREAM_SECRET_ACCESS_KEY`.

## Config

`/etc/litestream.yml`:

```yaml
dbs:
  - path: /data/app.db
    replicas:
      - type: s3
        bucket: fanfare-venue-backup
        path: kassa
        endpoint: https://<accountid>.r2.cloudflarestorage.com
        region: auto
        # creds from LITESTREAM_ACCESS_KEY_ID / LITESTREAM_SECRET_ACCESS_KEY
        sync-interval: 1s
        retention: 72h
        snapshot-interval: 1h
```

## Run as a service

Litestream ships a systemd unit; enable it to replicate continuously:

```bash
sudo systemctl enable --now litestream
sudo systemctl status litestream     # confirm "replicating"
```

Or as a sidecar in docker-compose alongside the app container (shared volume on `/data`):

```yaml
litestream:
  image: litestream/litestream
  command: replicate
  volumes:
    - app-data:/data
    - ./litestream.yml:/etc/litestream.yml:ro
  environment:
    - LITESTREAM_ACCESS_KEY_ID
    - LITESTREAM_SECRET_ACCESS_KEY
  restart: unless-stopped
```

Boot order on the Pi: **migrate → start app → litestream replicate**.

## Restore (spare Pi / disaster recovery)

```bash
# pull the latest snapshot+WAL back into a fresh DB file
litestream restore -o /data/app.db \
  s3://fanfare-venue-backup/kassa
# then start the app pointing at /data/app.db
```

Restore is point-in-time to the last synced WAL frame (seconds of potential loss at most).

## Verify

- [ ] `litestream replicate` reports the db and a healthy replica.
- [ ] Object storage shows generations + WAL segments accumulating.
- [ ] A test `litestream restore` to a scratch path reproduces the current data.

## Egress note

Litestream's only outbound traffic is to the R2/S3 endpoint — allow it through the RUT firewall as part of the **Pi-only WAN egress** rule (see `venue-network-setup.md`). It's small (KB of WAL frames), so it's cheap on a metered 5G SIM.
