# Package Rename Agent Prompt

Copy this prompt to start/continue the package rename work.

---

## Agent Prompt

```
## Context

You are continuing work on renaming the Crouton packages from @friendlyinternet/* to @fyit/*.

Read these files first:
1. /docs/upcoming/PLAN-package-rename-fyit.md - Full migration plan
2. /docs/upcoming/PROGRESS-package-rename.md - Progress tracker

## Your Task

1. Check the progress tracker to find the NEXT PENDING PHASE
2. Execute ONLY that phase (do not skip ahead)
3. Update the progress tracker as you work:
   - Mark items complete with [x]
   - Update phase status
4. After completing the phase:
   - Run typecheck to verify nothing is broken
   - Commit with the specified commit message
   - Update the progress tracker with the commit SHA
   - Add a log entry with today's date

## Phase-Specific Instructions

### Phase 0: Pre-Cleanup
Standardize all 20 package.json files with:
- author: "FYIT"
- repository.url: "git+https://github.com/pmcp/nuxt-crouton.git"
- repository.directory: "packages/{current-directory-name}"
- bugs.url: "https://github.com/pmcp/nuxt-crouton/issues"
- homepage: "https://github.com/pmcp/nuxt-crouton#readme"
- license: "MIT"

Do NOT rename packages yet.

### Phase 1: Rename
STOP if @fyit npm org is not registered - ask the user first.

Rename directories (remove nuxt- prefix) and update package names to @fyit/*.
Update pnpm-workspace.yaml.

### Phase 2: Create Module
Create packages/crouton/ with the unified Nuxt module per the plan.

### Phase 3: Update CLI
Update module-registry.mjs and other CLI files with new package names.

### Phase 4: Update References
Search/replace all @friendlyinternet/* references to @fyit/* across the codebase.

### Phase 5-6: Manual
These phases require npm publish access. Stop and inform the user.

## Completion Protocol

After completing your phase, output this EXACTLY:

---

✅ **Phase [X] Complete**

**Commit**: `[commit message]`
**SHA**: [commit sha]

**Next Phase**: [X+1] - [phase name]

**Prompt for next agent**:
```
Continue the package rename. Read /docs/upcoming/PROGRESS-package-rename.md to see current status and execute the next pending phase.
```

---

## Important Rules

- Only do ONE phase per session
- Always update the progress tracker
- Always run typecheck before committing
- Always commit at the end of the phase
- Never skip phases
- If blocked (e.g., npm org not registered), STOP and ask the user
```

---

## Quick Start Prompt (Copy This)

For fresh sessions, copy this minimal prompt:

```
Continue the package rename. Read /docs/upcoming/PROGRESS-package-rename.md to see current status and execute the next pending phase.
```

---

## First Run Prompt

For the very first session:

```
Start the package rename migration.

Read these files:
1. /docs/upcoming/PLAN-package-rename-fyit.md - Full plan
2. /docs/upcoming/PROGRESS-package-rename.md - Progress tracker

Execute Phase 0 (Pre-Cleanup) only. Update the progress tracker, commit your changes, and provide the prompt for the next agent.
```
