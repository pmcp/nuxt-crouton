# Commit Skill

Smart, granular commits following this project's conventions.

## Triggers

Use this skill when the user mentions:
- "commit", "git commit"
- "/commit"

## Rules

1. **NEVER use `git add .` or `git add -A`** — always stage specific files
2. **NEVER add `Co-Authored-By` lines** — omit any AI attribution footer
3. **NEVER commit unrelated changes together** — split into multiple commits if needed
4. **ALWAYS analyze changes before committing** — understand what changed and why
5. **ONLY commit files that were changed during this conversation** — if the working tree has pre-existing dirty files that were NOT part of the current task, leave them alone. Compare `git status` against what you actually touched in this session. When in doubt, ask the user.

## Workflow

### Step 1: Analyze the working tree

Run these in parallel:
- `git status` — see all changed/untracked files
- `git diff` — see unstaged changes
- `git diff --cached` — see already-staged changes
- `git log --oneline -5` — see recent commit style

### Step 2: Filter to conversation-relevant changes

From the full `git status` output, identify ONLY files that were created or modified as part of the current conversation. Ignore pre-existing changes that were already dirty before this session started.

**How to determine relevance:**
- Files you created or edited (via Edit/Write tools) in this conversation → include
- Files modified by commands you ran (e.g., generators, formatters) as part of the task → include
- Files that were already dirty before this session started → exclude
- Files changed by unrelated work or previous sessions → exclude
- If unsure → ask the user

List the excluded files explicitly so the user knows they're being left alone:
```
Skipping N file(s) not related to this session:
  - .gitignore (pre-existing change)
  - pnpm-lock.yaml (pre-existing change)
```

### Step 3: Group changes by intent

Categorize the **relevant** files into logical groups. Each group = one commit.

**Grouping rules:**
- Files that serve the same purpose go together (e.g., a component + its composable + its types)
- Config changes are separate from feature changes
- Documentation updates are separate from code changes
- Test files go with the code they test, not in a separate commit
- Migration files go with their schema changes

**Example groupings:**
```
Group 1: "feat(crouton-core): add useTeamMembers composable"
  - packages/crouton-core/app/composables/useTeamMembers.ts
  - packages/crouton-core/app/components/TeamMemberList.vue

Group 2: "fix(crouton-auth): resolve token refresh race condition"
  - packages/crouton-auth/server/utils/auth.ts

Group 3: "chore(root): update eslint config"
  - eslint.config.mjs
```

### Step 3: Present the plan to the user

Before committing anything, show:

```
I'd like to make N commit(s):

1. feat(crouton-core): add useTeamMembers composable
   Files: composables/useTeamMembers.ts, components/TeamMemberList.vue

2. fix(crouton-auth): resolve token refresh race condition
   Files: server/utils/auth.ts

Proceed?
```

Wait for user approval. If the user wants to adjust grouping or messages, do so.

### Step 4: Execute commits sequentially

For each group:
1. `git add <specific-files>`
2. `git commit` with the message (use HEREDOC format, no Co-Authored-By)

### Step 5: Confirm

Show `git log --oneline -N` (where N = number of commits made) to confirm.

## Commit Message Format

```
<type>(<scope>): <description>

[optional body — only if the change needs explanation]
```

### Types
- `feat` — New feature or capability
- `fix` — Bug fix
- `refactor` — Code restructuring (no behavior change)
- `docs` — Documentation only
- `test` — Adding or updating tests
- `chore` — Build, config, dependencies
- `perf` — Performance improvement
- `style` — Formatting, whitespace (no logic change)

### Scopes (monorepo package short names)
- `crouton` — Main module
- `crouton-core` — Core layer
- `crouton-cli` — CLI/generator
- `crouton-i18n` — i18n layer
- `crouton-editor` — Rich text layer
- `crouton-flow` — Flow layer
- `crouton-assets` — Assets layer
- `crouton-devtools` — Devtools
- `crouton-auth` — Auth layer
- `crouton-triage` — Triage layer
- `crouton-pages` — Pages layer
- `crouton-bookings` — Bookings layer
- `docs` — Documentation app
- `playground` — Playground app
- `rakim` — Rakim app
- `root` — Root config, workspace-level

For changes spanning multiple packages: `feat(crouton-cli,crouton-core): description`

### Message quality guidelines

**Good messages explain WHY, not WHAT:**
- `fix(crouton-auth): prevent duplicate session on rapid login` (why)
- ~~`fix(crouton-auth): change if condition in auth.ts`~~ (what — bad)

**Keep the subject line under 72 characters.**

**Use the body for context when the change isn't obvious:**
```
refactor(crouton-core): simplify team permission checks

Replaced nested conditionals with a permission map lookup.
The old approach was O(n²) for teams with many roles.
```

## HEREDOC Format (MANDATORY)

Always use this format to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(crouton-core): add useTeamMembers composable

Provides reactive team member list with role filtering
and invite status tracking.
EOF
)"
```

## Restructuring Previous Commits

If the new changes logically belong with a recent commit (e.g., a follow-up fix to something just committed), it's better to amend or restructure than to create a noisy separate commit.

**When to amend/restructure:**
- A small fix for something committed moments ago in the same session
- The previous commit message should be improved to cover the combined changes
- Commits from this session that would read better squashed or reordered

**When NOT to amend:**
- The previous commit was from a different session or a different topic
- The previous commit has already been pushed to a shared branch
- You're unsure — ask the user

**How to propose it:**
```
The changes to server/utils/auth.ts look like a follow-up to your last commit:
  "fix(crouton-auth): handle expired tokens"

Options:
1. Amend into that commit (recommended — keeps history clean)
2. Create a separate commit
```

Wait for user approval before amending.

**To amend:**
```bash
git add <specific-files>
git commit --amend -m "$(cat <<'EOF'
fix(crouton-auth): handle expired tokens

Also covers edge case where refresh token is revoked
mid-session.
EOF
)"
```

## Edge Cases

### Nothing to commit
If `git status` shows no changes, tell the user — don't create an empty commit.

### Already-staged files
If files are already staged (`git diff --cached`), include them in the analysis. Ask the user if the staging is intentional or if they want to restage.

### Untracked files
Ask about untracked files — they might be intentional new files or accidental artifacts. Never auto-add untracked files without confirming.

### Sensitive files
Never commit: `.env`, `credentials.json`, `*.key`, `*.pem`, `.secret*`, `node_modules/`. Warn the user if these appear in the changeset.
