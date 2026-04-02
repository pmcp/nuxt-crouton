#!/bin/bash
# gate-package-edits.sh
# Blocks Edit/Write calls targeting files in packages/
# Exit 2 = block the action (Claude Code PreToolUse convention)
#
# Override: after getting user approval, the agent writes the package name
# to .claude/.package-edit-approved (one per line). The hook allows edits
# to approved packages.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalize to relative path from project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REL_PATH="${FILE_PATH#$PROJECT_DIR/}"

# Only gate packages/
if [[ "$REL_PATH" != packages/* ]]; then
  exit 0
fi

PKG=$(echo "$REL_PATH" | cut -d'/' -f2)
APPROVAL_FILE="$PROJECT_DIR/.claude/.package-edit-approved"

# Check if this package has been approved
if [ -f "$APPROVAL_FILE" ] && grep -qx "$PKG" "$APPROVAL_FILE" 2>/dev/null; then
  exit 0
fi

echo "BLOCKED: This edit targets shared package '$PKG' (packages/$PKG)." >&2
echo "Shared packages affect all consuming apps." >&2
echo "" >&2
echo "To proceed after user approval, run:" >&2
echo "  echo '$PKG' >> $APPROVAL_FILE" >&2
exit 2
