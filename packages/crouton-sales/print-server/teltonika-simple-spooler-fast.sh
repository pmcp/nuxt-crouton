#!/bin/sh

# Crouton-sales print spooler for Teltonika RUT-series routers (BusyBox/RutOS).
#
# Polls the hosted app for pending print jobs, decodes the base64 ESC/POS
# payload, streams it to the thermal printer's raw TCP port (9100), then calls
# back to mark the job complete/failed. Outbound-only — no inbound exposure.
#
# Config is via environment variables (set them in the procd init service,
# /etc/init.d/print_server — see print_server.init):
#   API_URL   - base URL of the hosted app, e.g. https://your-app.pages.dev
#   API_KEY   - must match the app's NUXT_CROUTON_SALES_PRINT_API_KEY secret
#   EVENT_ID  - the sales event to poll jobs for
#
# Notes:
# - Uses a pure-awk base64 decoder because the minimal BusyBox build on RutOS
#   has no `base64` applet. awk on BusyBox is byte-safe, so 8-bit ESC/POS
#   (incl. CP858 high bytes) survives.
# - Uses `nc IP PORT` (the minimal nc form) — compatible with RutOS BusyBox nc.

# Configuration - can be overridden with environment variables
API_URL="${API_URL:-http://192.168.1.214:3000}"
API_KEY="${API_KEY:-1234}"
EVENT_ID="${EVENT_ID:-CHANGE_ME}"
PRINTER_PORT="9100"
PROCESSED="/tmp/processed_ids.txt"

# Add Google DNS if not present
grep -q "8.8.8.8" /etc/resolv.conf || echo "nameserver 8.8.8.8" >> /etc/resolv.conf

echo "$(date '+%H:%M:%S') Crouton print spooler started"
echo "  API_URL: $API_URL"
echo "  EVENT_ID: $EVENT_ID"

# Faster base64 decoder - simplified version
decode_base64() {
    awk '
    BEGIN {
        b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        for (i = 0; i < 64; i++) {
            b64_to_num[substr(b64, i+1, 1)] = i
        }
        b64_to_num["="] = 0
    }
    {
        gsub(/[ \t\r\n]/, "", $0)
        for (i = 1; i <= length($0); i += 4) {
            c1 = substr($0, i, 1); c2 = substr($0, i+1, 1)
            c3 = substr($0, i+2, 1); c4 = substr($0, i+3, 1)
            n1 = b64_to_num[c1]; n2 = b64_to_num[c2]
            n3 = (c3 == "=") ? 0 : b64_to_num[c3]
            n4 = (c4 == "=") ? 0 : b64_to_num[c4]
            printf "%c", (n1 * 4) + int(n2 / 16)
            if (c3 != "=") printf "%c", ((n2 % 16) * 16) + int(n3 / 4)
            if (c4 != "=") printf "%c", ((n3 % 4) * 64) + n4
        }
    }'
}

# Process jobs in parallel
process_job() {
    JOB_ID="$1"
    PRINT_DATA="$2"
    JOB_PRINTER_IP="$3"

    TMPFILE="/tmp/print_$JOB_ID.bin"

    # Decode print data
    echo "$PRINT_DATA" | decode_base64 > "$TMPFILE"

    if [ -s "$TMPFILE" ]; then
        # Send to printer (simplified - no reset command for speed)
        timeout 5 nc $JOB_PRINTER_IP $PRINTER_PORT < "$TMPFILE" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo "$(date '+%H:%M:%S') Job $JOB_ID sent to $JOB_PRINTER_IP"
            echo "$JOB_ID" >> "$PROCESSED"

            # Mark as completed (synchronous — the outer process_job is already
            # backgrounded; backgrounding again here lets procd reap the curl
            # before it lands, leaving the job stuck at status=printing).
            curl -s -m 3 -X POST \
                -H "x-api-key: $API_KEY" \
                -H "Content-Type: application/json" \
                "$API_URL/api/print-server/jobs/$JOB_ID/complete" >/dev/null 2>&1
        else
            echo "$(date '+%H:%M:%S') Job $JOB_ID failed to print"
            # Mark as failed (synchronous — see note above)
            curl -s -m 3 -X POST \
                -H "x-api-key: $API_KEY" \
                -H "Content-Type: application/json" \
                -d '{"errorMessage":"Failed to send to printer"}' \
                "$API_URL/api/print-server/jobs/$JOB_ID/fail" >/dev/null 2>&1
        fi
    else
        # Decode produced no bytes — report failure so the job doesn't sit at
        # status=printing forever.
        echo "$(date '+%H:%M:%S') Job $JOB_ID: empty decode (bad printData)"
        curl -s -m 3 -X POST \
            -H "x-api-key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"errorMessage":"Empty base64 decode"}' \
            "$API_URL/api/print-server/jobs/$JOB_ID/fail" >/dev/null 2>&1
    fi

    rm -f "$TMPFILE"
}

while true; do
    # Poll API with shorter timeout (crouton-sales format)
    # Remove newlines from JSON response for grep/sed parsing
    RESPONSE=$(curl -s -m 5 -H "x-api-key: $API_KEY" "$API_URL/api/print-server/events/$EVENT_ID/jobs?mark_as_printing=true" 2>/dev/null)
    RESPONSE=$(echo "$RESPONSE" | tr -d '\n\r' | tr -s ' ')

    if [ ! -z "$RESPONSE" ] && echo "$RESPONSE" | grep -q '"printData"'; then
        # Extract all job data in one pass (handle space after colon in JSON)
        JOBLIST="/tmp/jobs_$$.txt"
        echo "$RESPONSE" | grep -o '"id": *"[^"]*"' | sed 's/"id": *"\([^"]*\)"/\1/g' > "$JOBLIST"

        # Process jobs in parallel (up to 3 at once)
        ACTIVE_JOBS=0
        while IFS= read -r JOB_ID; do
            if [ ! -z "$JOB_ID" ]; then
                # Check if already processed
                if [ -f "$PROCESSED" ] && grep -q "^$JOB_ID$" "$PROCESSED"; then
                    continue
                fi

                # Extract job data (camelCase field names for crouton-sales, handle spaces in JSON)
                PRINT_DATA=$(echo "$RESPONSE" | sed -n "s/.*\"id\": *\"$JOB_ID\"[^}]*\"printData\": *\"\([^\"]*\)\".*/\1/p")
                JOB_PRINTER_IP=$(echo "$RESPONSE" | sed -n "s/.*\"id\": *\"$JOB_ID\"[^}]*\"printerIp\": *\"\([^\"]*\)\".*/\1/p")

                if [ ! -z "$PRINT_DATA" ] && [ ! -z "$JOB_PRINTER_IP" ]; then
                    echo "$(date '+%H:%M:%S') Processing job $JOB_ID to $JOB_PRINTER_IP"

                    # Run job in background
                    process_job "$JOB_ID" "$PRINT_DATA" "$JOB_PRINTER_IP" &

                    ACTIVE_JOBS=$((ACTIVE_JOBS + 1))

                    # Limit concurrent jobs to avoid overwhelming
                    if [ $ACTIVE_JOBS -ge 3 ]; then
                        wait  # Wait for some jobs to complete
                        ACTIVE_JOBS=0
                    fi
                fi
            fi
        done < "$JOBLIST"

        # Wait for remaining jobs
        wait
        rm -f "$JOBLIST"

        # Short sleep when jobs found
        sleep 1
    else
        # Longer sleep when no jobs
        sleep 2
    fi
done
