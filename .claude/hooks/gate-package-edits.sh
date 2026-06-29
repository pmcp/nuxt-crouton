#!/bin/bash
# gate-package-edits.sh
# Blocks Edit/Write calls targeting files in packages/
# Exit 2 = block the action (Claude Code PreToolUse convention)
#
# Two approval channels (either one un-gates a given package):
#  1. Interactive: after user approval, write the package name to
#     .claude/.package-edit-approved (one per line). Session-scoped, gitignored.
#  2. Epic-scoped (#350): the CROUTON_PACKAGE_EDIT_APPROVED env var — a
#     space/comma-separated list of approved package names. Set once when a
#     package-touching epic is approved; inherited by every spawned agent/worktree,
#     so the whole task-decomposition run is covered by one approval. Env is never
#     committed, so (unlike a file) it cannot leak the gate-off state into main.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalize to relative path from project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REL_PATH="${FILE_PATH#$PROJECT_DIR/}"

# Only gate packages/.
# This is the LIVE ENFORCER of the stage model's edit-guard (harness.config.mjs — the
# `package` stage's `editGuard: true`; epic #952/#955). It hardcodes `packages/*` ON
# PURPOSE: this hook fires on EVERY Edit/Write, so it must not spawn Node per call just to
# re-derive what the config already declares. If you add/rename an edit-guarded stage in
# harness.config.mjs, update this prefix to match — the deliberate, documented exception
# to "read the resolver, don't match folders by hand".
if [[ "$REL_PATH" != packages/* ]]; then
  exit 0
fi

PKG=$(echo "$REL_PATH" | cut -d'/' -f2)
APPROVAL_FILE="$PROJECT_DIR/.claude/.package-edit-approved"

# Channel 1 — interactive approval file (one package name per line).
if [ -f "$APPROVAL_FILE" ] && grep -qx "$PKG" "$APPROVAL_FILE" 2>/dev/null; then
  exit 0
fi

# Channel 2 — epic-scoped env approval. Normalise separators (comma/space) to
# whitespace and match the package as a whole word.
if [ -n "$CROUTON_PACKAGE_EDIT_APPROVED" ]; then
  for approved in ${CROUTON_PACKAGE_EDIT_APPROVED//,/ }; do
    if [ "$approved" = "$PKG" ]; then
      exit 0
    fi
  done
fi

echo "BLOCKED: This edit targets shared package '$PKG' (packages/$PKG)." >&2
echo "Shared packages affect all consuming apps." >&2
echo "" >&2
echo "To proceed after user approval, either:" >&2
echo "  • interactive:  echo '$PKG' >> $APPROVAL_FILE" >&2
echo "  • epic-scoped:  export CROUTON_PACKAGE_EDIT_APPROVED=\"\$CROUTON_PACKAGE_EDIT_APPROVED $PKG\"" >&2
exit 2
