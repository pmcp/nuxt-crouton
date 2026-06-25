#!/usr/bin/env bash
# spike-pidev.sh — WS1 of epic #669 / spike #670
# ---------------------------------------------------------------------------
# Smallest possible test of "pi.dev replaces the in-job agent, GitHub stays
# the orchestrator". Runs pi.dev LOCALLY against a throwaway issue and checks
# the three success criteria from #670:
#   1. Skills consumed   — pi reads CLAUDE.md + the relevant SKILL.md
#   2. PR / sub-issues    — pi produces a real deliverable on the issue
#   3. Artifact-gate      — that deliverable is the kind the #461 gate passes
#
# This does NOT touch CI. It answers "is the epic worth it?" in an afternoon,
# off the critical path of the Mac-mini runner chain (#653/#654/#657).
#
# Run it ON the Mac mini (egress unrestricted there; this sandbox can't reach
# pi.dev / the downloads API):
#   ANTHROPIC_API_KEY=sk-... ./scripts/spike-pidev.sh 999            # cheap Claude
#   PI_MODEL=ollama:qwen2.5-coder:7b ./scripts/spike-pidev.sh 999    # local model
#
# IMPORTANT — flags are best-effort. pi.dev's exact CLI surface (print-mode
# flag, turn cap, model selector) must be confirmed against `pi --help` on the
# box; this script prints that help first and centralises the invocation in
# ONE place (PI_RUN, below) so you can correct it once. Treat every assumption
# marked «VERIFY» as a thing the spike is meant to discover.
set -uo pipefail

ISSUE="${1:?usage: spike-pidev.sh <throwaway-issue-number>}"
REPO="${REPO:-FriendlyInternet/nuxt-crouton}"
PI_MODEL="${PI_MODEL:-claude-haiku-4-5-20251001}"   # cheap by default — we want an early quality read
PROMPT="${PROMPT:-/task-decompose #${ISSUE}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
LOG="${ROOT}/screenshots/.pidev-spike-${STAMP}.log"   # screenshots/ is gitignored — scratch is fine here
mkdir -p "$(dirname "$LOG")"

say(){ printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

say "0 · environment"
command -v pi >/dev/null 2>&1 || { echo "pi not found. Install: npx @robzolkos/lazypi   (or npm i -g @earendil-works/pi-coding-agent)"; exit 127; }
pi --version 2>/dev/null || true
echo "--- pi --help (CONFIRM the real flags, then fix PI_RUN below) ---"
pi --help 2>&1 | sed 's/^/  /' || true

# ── Skill discovery ────────────────────────────────────────────────────────
# Our skills live in .claude/skills/ (Agent Skills standard). pi loads skills
# from project (.pi/skills) and global (~/.pi/agent/skills) dirs. «VERIFY» pi
# honours the Agent Skills standard layout; if not, this symlink is the bridge.
say "1 · expose .claude skills to pi"
mkdir -p "${ROOT}/.pi"
if [ ! -e "${ROOT}/.pi/skills" ]; then ln -s "../.claude/skills" "${ROOT}/.pi/skills" && echo "linked .pi/skills -> .claude/skills"; else echo ".pi/skills already present"; fi
echo "NOTE: CLAUDE.md is read by pi only if its skill/system-prompt convention picks it up — confirm in the log (criterion 1)."

# ── The one place the pi invocation lives — fix flags here after `pi --help` ──
# «VERIFY» print/non-interactive flag (maybe `-p` / `--print`), turn cap, model flag.
PI_RUN=( pi --print --model "${PI_MODEL}" "${PROMPT}" )

say "2 · run pi.dev on: ${PROMPT}   (model: ${PI_MODEL})"
echo "cmd: ${PI_RUN[*]}" | tee "$LOG"
START=$(date +%s)
"${PI_RUN[@]}" 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}
END=$(date +%s)
echo "exit=${RC}  wall=$((END-START))s" | tee -a "$LOG"

# ── Capture for the WS1 report / WS2 parity matrix ──────────────────────────
say "3 · success criteria (eval against ${LOG} and the issue on GitHub)"
cat <<EOF
  [ ] 1. Skills consumed   — grep the log: did pi read CLAUDE.md and a SKILL.md and FOLLOW them?
          grep -iE 'CLAUDE.md|SKILL.md|task-decompose' "${LOG}"
  [ ] 2. Deliverable       — did it open a PR or create sub-issues on #${ISSUE}?
          gh issue view ${ISSUE} -R ${REPO} --json title,state; gh pr list -R ${REPO} --search "#${ISSUE}"
  [ ] 3. Artifact-gate     — is that deliverable the kind the #461 gate passes
          (a linked PR with 'Closes #${ISSUE}', OR newly-created sub-issues, OR status:blocked+review)?

  CAPTURE for #669/#670 (feeds the WS2 parity matrix):
    • model used:        ${PI_MODEL}
    • run cost:          (from pi's usage / tmustier /usage dashboard)
    • wall time:         $((END-START))s   exit: ${RC}
    • MISSING features:  every claude-code-action capability pi lacked
                         (skills autoload? --max-turns equiv? MCP/crouton-mcp? bot guard? push-that-retriggers-CI?)
  log: ${LOG}
EOF
