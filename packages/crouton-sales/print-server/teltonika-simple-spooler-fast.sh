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
# - A job is only marked complete after the printer confirms it is online with
#   paper present (ESC/POS DLE EOT status queries appended to the payload).
#   Set STATUS_CHECK=0 for the legacy "TCP send = done" behavior.

# Configuration - can be overridden with environment variables
API_URL="${API_URL:-http://192.168.1.214:3000}"
API_KEY="${API_KEY:-1234}"
EVENT_ID="${EVENT_ID:-CHANGE_ME}"
PRINTER_PORT="9100"
PROCESSED="/tmp/processed_ids.txt"
# STATUS_CHECK=1 (default): after sending the ticket, query the printer with
# ESC/POS DLE EOT and only mark the job complete when the printer answers
# "online, paper present". STATUS_CHECK=0 restores the legacy fire-and-forget
# behavior (complete as soon as the TCP send succeeds) for printers that don't
# answer DLE EOT.
STATUS_CHECK="${STATUS_CHECK:-1}"
# Seconds to hold the socket open after sending — lets the printer drain its
# receive buffer and answer the status queries on the same connection.
DRAIN_SECS="${DRAIN_SECS:-2}"

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

# Print the decimal value of the first bytes of a file, one per line (max 3).
# Used to parse DLE EOT status responses — minimal BusyBox has no od/hexdump
# guarantee, but awk is byte-safe on RutOS (same trick as decode_base64).
# Status bytes are never 0x00 or 0x0A (fixed bit 1 is always set), so awk's
# line handling can't eat them.
read_status_bytes() {
    awk 'BEGIN { for (i = 1; i < 256; i++) ord[sprintf("%c", i)] = i }
    n < 3 {
        for (j = 1; j <= length($0) && n < 3; j++) { print ord[substr($0, j, 1)]; n++ }
    }' "$1"
}

# The three real-time status queries sent together, answered in order:
#   DLE EOT 1 (printer status), DLE EOT 2 (offline cause), DLE EOT 4 (paper).
STATUS_QUERIES='\020\004\001\020\004\002\020\004\004'

# Classify the three DLE EOT response bytes ($1 $2 $3, decimal; may be empty).
# $4 = message to use when there was no response at all.
# Sets STATUS_ERROR to a human-readable reason, or "" when the printer is
# online with paper present.
classify_status() {
    B1="$1"; B2="$2"; B3="$3"
    STATUS_ERROR=""
    if [ -z "$B1" ]; then
        STATUS_ERROR="$4"
    elif [ $(( B1 & 147 )) -ne 18 ]; then
        # Every DLE EOT response has fixed bits 0/1/4/7 = 0/1/1/0,
        # i.e. (byte & 0x93) == 0x12 — anything else is not ESC/POS status.
        STATUS_ERROR="Unexpected status response - not an ESC/POS printer?"
    elif [ -n "$B2" ] && [ $(( B2 & 4 )) -ne 0 ]; then
        # DLE EOT 2: bit 2 = cover open
        STATUS_ERROR="Cover open"
    elif { [ -n "$B3" ] && [ $(( B3 & 96 )) -ne 0 ]; } || { [ -n "$B2" ] && [ $(( B2 & 32 )) -ne 0 ]; }; then
        # DLE EOT 4: bits 5+6 = roll paper end / DLE EOT 2: bit 5 = stopped, paper end
        STATUS_ERROR="Paper out"
    elif [ -n "$B2" ] && [ $(( B2 & 64 )) -ne 0 ]; then
        # DLE EOT 2: bit 6 = error condition
        STATUS_ERROR="Printer error"
    elif [ $(( B1 & 8 )) -ne 0 ]; then
        # DLE EOT 1: bit 3 = offline for any other reason
        STATUS_ERROR="Printer offline"
    fi
}

# Callbacks are synchronous — the outer process_job is already backgrounded;
# backgrounding again here lets procd reap the curl before it lands, leaving
# the job stuck at status=printing.
report_complete() {
    curl -s -m 3 -X POST \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        "$API_URL/api/print-server/jobs/$1/complete" >/dev/null 2>&1
}

# $2 = errorMessage (must not contain double quotes)
report_fail() {
    curl -s -m 3 -X POST \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"errorMessage\":\"$2\"}" \
        "$API_URL/api/print-server/jobs/$1/fail" >/dev/null 2>&1
}

# Process jobs in parallel
process_job() {
    JOB_ID="$1"
    PRINT_DATA="$2"
    JOB_PRINTER_IP="$3"

    TMPFILE="/tmp/print_$JOB_ID.bin"
    RESPFILE="/tmp/printresp_$JOB_ID.bin"

    # Decode print data
    echo "$PRINT_DATA" | decode_base64 > "$TMPFILE"

    if [ ! -s "$TMPFILE" ]; then
        # Decode produced no bytes — report failure so the job doesn't sit at
        # status=printing forever.
        echo "$(date '+%H:%M:%S') Job $JOB_ID: empty decode (bad printData)"
        report_fail "$JOB_ID" "Empty base64 decode"
        rm -f "$TMPFILE"
        return
    fi

    if [ "$STATUS_CHECK" = "1" ]; then
        # Pre-flight: query status on its OWN connection BEFORE sending the
        # ticket. A printer in an error state (no paper, cover open) stops
        # draining its receive buffer, so queries appended after a payload get
        # stuck behind the jammed ticket data and are never answered — on an
        # empty connection a live ESC/POS printer always answers, even while
        # offline. This also avoids dumping the ticket into a jammed buffer,
        # which would print as a ghost ticket once paper is reloaded.
        : > "$RESPFILE"
        ( printf "$STATUS_QUERIES"; sleep 1 ) | timeout 8 nc "$JOB_PRINTER_IP" "$PRINTER_PORT" > "$RESPFILE" 2>/dev/null

        set -- $(read_status_bytes "$RESPFILE")
        classify_status "${1:-}" "${2:-}" "${3:-}" \
            "No status response from printer (offline, wrong IP, or not an ESC/POS device)"

        if [ -n "$STATUS_ERROR" ]; then
            echo "$(date '+%H:%M:%S') Job $JOB_ID: pre-flight failed on $JOB_PRINTER_IP: $STATUS_ERROR"
            report_fail "$JOB_ID" "$STATUS_ERROR"
            rm -f "$TMPFILE" "$RESPFILE"
            return
        fi

        # Printer is healthy — send the ticket with the same status queries
        # appended as a confirmation pass. The trailing sleep keeps stdin (and
        # thus the socket) open so the printer can drain its buffer and reply
        # before nc closes — abrupt close right after send is how tickets used
        # to vanish silently.
        printf "$STATUS_QUERIES" >> "$TMPFILE"
        : > "$RESPFILE"
        ( cat "$TMPFILE"; sleep "$DRAIN_SECS" ) | timeout 15 nc "$JOB_PRINTER_IP" "$PRINTER_PORT" > "$RESPFILE" 2>/dev/null

        set -- $(read_status_bytes "$RESPFILE")
        classify_status "${1:-}" "${2:-}" "${3:-}" \
            "Printer stopped responding while printing (paper ran out mid-ticket?)"

        if [ -n "$STATUS_ERROR" ]; then
            echo "$(date '+%H:%M:%S') Job $JOB_ID: post-send check failed on $JOB_PRINTER_IP: $STATUS_ERROR"
            report_fail "$JOB_ID" "$STATUS_ERROR"
        else
            echo "$(date '+%H:%M:%S') Job $JOB_ID printed on $JOB_PRINTER_IP"
            echo "$JOB_ID" >> "$PROCESSED"
            report_complete "$JOB_ID"
        fi
    else
        # Legacy fire-and-forget: trust the TCP send (no confirmation the
        # printer actually printed).
        timeout 5 nc "$JOB_PRINTER_IP" "$PRINTER_PORT" < "$TMPFILE" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo "$(date '+%H:%M:%S') Job $JOB_ID sent to $JOB_PRINTER_IP"
            echo "$JOB_ID" >> "$PROCESSED"
            report_complete "$JOB_ID"
        else
            echo "$(date '+%H:%M:%S') Job $JOB_ID failed to print"
            report_fail "$JOB_ID" "Failed to send to printer"
        fi
    fi

    rm -f "$TMPFILE" "$RESPFILE"
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
