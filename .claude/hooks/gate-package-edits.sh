#!/bin/bash
# gate-package-edits.sh
# Blocks Edit/Write calls targeting files in packages/
# Exit 2 = block the action (Claude Code PreToolUse convention)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalize to relative path from project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REL_PATH="${FILE_PATH#$PROJECT_DIR/}"

# Block if targeting packages/
if [[ "$REL_PATH" == packages/* ]]; then
  # Extract package name for a clearer message
  PKG=$(echo "$REL_PATH" | cut -d'/' -f2)
  echo "BLOCKED: This edit targets shared package '$PKG' (packages/$PKG)." >&2
  echo "Shared packages affect all consuming apps. Ask the user for explicit approval before modifying package code." >&2
  exit 2
fi

exit 0
