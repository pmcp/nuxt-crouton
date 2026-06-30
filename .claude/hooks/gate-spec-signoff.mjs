#!/usr/bin/env node
// gate-spec-signoff.mjs — PreToolUse gate for Edit|Write on a POC spec ledger (`spec.json`).
//
// The done-rule (AGENTS.md): a unit of work is "done" only when checked + concretely
// signed off — never on a proxy. For the spec ledger that means an entry may not be
// marked `status: "settled"` (the contract / "done") unless its `signedOff` field carries
// a recorded approval token (e.g. "lgtm v50"). Without this, an agent can self-assert
// "done" by editing one word — exactly the failure (#988) epic #992 exists to kill.
//
// This hook reconstructs the RESULTING file content (so it sees the post-edit state),
// parses it, and blocks if any `settled` entry has an empty/missing `signedOff`.
//
// Scope: only files whose path ends in `spec.json`. Anything else → allow.
// Fail-open on unparseable JSON (a half-written file is the editor's problem, not this
// gate's) — the invariant only bites on a well-formed ledger.
// Block: exit 2 with the offending ids (PreToolUse exit 2 cancels the call, stderr → agent).

import { readFileSync } from 'node:fs'

let raw = ''
process.stdin.on('data', c => { raw += c })
process.stdin.on('end', () => {
  let input = {}
  try { input = JSON.parse(raw).tool_input || {} } catch { process.exit(0) } // can't parse call → don't block

  const filePath = input.file_path || ''
  if (!filePath.endsWith('spec.json')) process.exit(0) // not a spec ledger → allow

  // Reconstruct the resulting file content.
  let resulting = ''
  if (typeof input.content === 'string') {
    // Write — content IS the whole new file.
    resulting = input.content
  } else if (typeof input.old_string === 'string' && typeof input.new_string === 'string') {
    // Edit — apply the replacement to the current on-disk file to get the post-edit content.
    let current = ''
    try { current = readFileSync(filePath, 'utf8') } catch { process.exit(0) } // new file via Edit shouldn't happen → allow
    resulting = input.replace_all
      ? current.split(input.old_string).join(input.new_string)
      : current.replace(input.old_string, input.new_string)
  } else {
    process.exit(0) // unknown tool shape → allow
  }

  let entries
  try { entries = JSON.parse(resulting) } catch { process.exit(0) } // malformed → fail-open
  if (!Array.isArray(entries)) process.exit(0)

  const offenders = entries
    .filter(e => e && e.status === 'settled' && !(typeof e.signedOff === 'string' && e.signedOff.trim()))
    .map(e => (e && e.id) || '(no id)')

  if (offenders.length === 0) process.exit(0) // every settled entry is signed off → allow

  process.stderr.write(
    'Blocked: a spec.json entry can\'t be `status: "settled"` without a recorded sign-off.\n' +
    'The done-rule (AGENTS.md): "done" is derived from a sign-off, never self-asserted.\n\n' +
    'Entries missing `signedOff`: ' + offenders.join(', ') + '\n\n' +
    'Either populate `signedOff` with the approval token (e.g. "lgtm v50") once a human has\n' +
    'signed off, or set `status` to "stopgap"/"new" until then. Then re-apply the edit.\n'
  )
  process.exit(2)
})
