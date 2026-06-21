<!--
  Red-team report template (epic #540). The /red-team skill and the red-team
  subagent write one report per run to:
      writeups/reports/red-team-<scope-slug>-YYYYMMDD.md
  Copy this structure. <scope-slug> is "repo" for a whole-repo sweep, else a
  path-derived slug (e.g. "apps-velo", "pkg-crouton-auth", "pr-541").
  This file is the format reference — it is NOT itself a report. Keep it.
-->

# 🔴 Red-team report — `<scope>`

- **Scope:** `<repo | path | PR #NN diff>`
- **Depth:** `<quick | standard | deep>`
- **Date:** `YYYY-MM-DD`
- **Commit:** `<short SHA>`
- **Run by:** `<interactive /red-team | CI red-team.yml | daily red-team-daily.yml>`

## Summary

| Severity | Confirmed | Suspected |
|----------|-----------|-----------|
| 🔴 Critical | 0 | 0 |
| 🟠 High | 0 | 0 |
| 🟡 Medium | 0 | 0 |
| ⚪ Low | 0 | 0 |

> One-line verdict: `<e.g. "No high/critical findings — 2 medium hardening gaps." >`
> **Filed:** `<links to any security/sec:* issues opened for confirmed high/criticals, or "none">`

<!--
  Per-finding sections follow, grouped by severity (highest first). Drop any
  empty group. Each finding is one block. "confidence: confirmed" means it was
  actually reproduced (dynamic, deep runs); "suspected" means reasoned from the
  code but not exercised. ONLY confirmed high/critical findings become issues.
-->

## 🔴 Critical

### `<short finding title>`
- **Severity:** critical
- **Confidence:** `<confirmed | suspected>`
- **Location:** `path/to/file.ts:NN` · route `<METHOD /api/teams/[id]/...>`
- **Category:** `<team-isolation | authz | injection | secret-exposure | ssrf | upload | cache-leak | rate-limit | other>`
- **What's exploitable:** `<the flaw, in one or two sentences>`
- **Repro:** `<concrete steps / the malicious request — for confirmed, the actual proof>`
- **Suggested fix:** `<the specific change — name the helper, e.g. "call resolveTeamAndCheckMembership(event) before the query">`

## 🟠 High

### `<short finding title>`
- **Severity:** high
- **Confidence:** `<confirmed | suspected>`
- **Location:** `path/to/file.ts:NN`
- **Category:** `<...>`
- **What's exploitable:** `<...>`
- **Repro:** `<...>`
- **Suggested fix:** `<...>`

## 🟡 Medium

### `<short finding title>`
- **Severity:** medium
- **Location:** `path/to/file.ts:NN`
- **What's exploitable:** `<...>`
- **Suggested fix:** `<...>`

## ⚪ Low

- `<one-line hardening note>` — `path/to/file.ts:NN`

## Out of scope / not checked

- `<anything the depth/scope deliberately skipped, so the next run knows>`
