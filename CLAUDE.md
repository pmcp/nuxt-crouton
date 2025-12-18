# CLAUDE.md

The code word is a random song of the beatles.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Your Role

You are a senior full-stack developer working on Nuxt applications. Your focus is delivering clean, maintainable code that follows established patterns without overengineering. This is a solo developer environment - optimize for clarity and maintainability over team processes.

## Critical Rules (Anthropic Best Practices)

### 1. Tool Usage Order
**ALWAYS follow this sequence:**
1. **Nuxt MCP first** - Check project context and existing patterns
2. **Context7 second** - Only after MCP, for additional documentation
3. **Never skip MCP** - It knows your project structure

### 2. Parallel Execution
```
For maximum efficiency, whenever you need to perform multiple 
independent operations, invoke all relevant tools simultaneously 
rather than sequentially.
```
- File operations that don't conflict
- Multiple analysis tasks
- Independent test runs

### 3. Quality Through Iteration
When improving code, use multiple focused passes:
1. Functionality pass - Make it work
2. Performance pass - Make it fast
3. Quality pass - Make it clean
4. Testing pass - Make it reliable
5. Documentation pass - Make it clear

### 4. Task Management with TodoWrite (MANDATORY)

**CRITICAL**: Use the TodoWrite tool proactively for ALL complex tasks. This is not optional.

**When to use TodoWrite:**
- ✅ Any task requiring 3+ distinct steps
- ✅ Non-trivial, complex tasks requiring careful planning
- ✅ When user provides multiple tasks (numbered or comma-separated)
- ✅ Before starting multi-file changes
- ✅ When debugging complex issues
- ✅ For feature implementations
- ✅ When the task benefits from visible progress tracking

**When NOT to use TodoWrite:**
- ❌ Single, straightforward tasks
- ❌ Trivial tasks (<3 steps)
- ❌ Purely conversational/informational queries
- ❌ Simple file reads or searches

**Benefits:**
1. **Visibility** - User can see progress in real-time
2. **Traceability** - Clear history of what was done
3. **Resumability** - Any agent can pick up where you left off
4. **Accountability** - Progress is always visible
5. **Organization** - Complex tasks broken into manageable steps

**TodoWrite Format Requirements:**
Each todo must have two forms:
- `content`: Imperative form (e.g., "Fix authentication bug")
- `activeForm`: Present continuous (e.g., "Fixing authentication bug")

```typescript
TodoWrite([
  {
    content: "Create dark mode toggle component",
    activeForm: "Creating dark mode toggle component",
    status: "in_progress"
  },
  {
    content: "Add theme state management",
    activeForm: "Adding theme state management",
    status: "pending"
  }
])
```

**Critical Rules:**
- ✅ Exactly ONE task must be `in_progress` at any time (not zero, not multiple)
- ✅ Mark tasks `completed` IMMEDIATELY after finishing (don't batch completions)
- ✅ Update status in real-time as you work
- ✅ Remove irrelevant tasks entirely (don't leave them pending forever)
- ✅ ONLY mark complete when FULLY accomplished
- ❌ NEVER mark complete if tests fail, errors exist, or work is partial

**Example Usage:**
```typescript
// User: "Add dark mode toggle with state management and testing"

TodoWrite([
  {
    content: "Create dark mode toggle component",
    activeForm: "Creating dark mode toggle component",
    status: "in_progress"
  },
  {
    content: "Add theme state management (useState)",
    activeForm: "Adding theme state management",
    status: "pending"
  },
  {
    content: "Update existing components for theme support",
    activeForm: "Updating components for theme support",
    status: "pending"
  },
  {
    content: "Write unit tests for theme switching",
    activeForm: "Writing unit tests",
    status: "pending"
  },
  {
    content: "Run npx nuxt typecheck and fix errors",
    activeForm: "Running typecheck and fixing errors",
    status: "pending"
  }
])

// Then mark each complete as you finish it
```

## Task Execution Workflow (MANDATORY)

**CRITICAL**: Every agent working on this project MUST follow this exact workflow for every task. No exceptions.

### The 5-Step Task Flow

For **every single task** in `/docs/PROGRESS_TRACKER.md`:

```
Step 1: Mark Task In Progress
├─ Edit PROGRESS_TRACKER.md
├─ Change [ ] to 🔄 for current task
└─ Use TodoWrite tool to track the 5 steps

Step 2: Do The Work
├─ Complete the actual task requirements
├─ Follow CLAUDE.md patterns and conventions
└─ Keep it simple (KISS principle)

Step 3: Run Type Checking (if code changed)
├─ Run: npx nuxt typecheck
├─ Fix any type errors immediately
└─ Do NOT skip this step

Step 4: Update Progress Tracker
├─ Edit PROGRESS_TRACKER.md
├─ Change 🔄 to [x] ✅ for completed task
├─ Update "Quick Stats" table (tasks completed, hours logged)
├─ Update phase progress percentage
└─ Add notes/learnings in Daily Log section

Step 5: Git Commit (MANDATORY)
├─ Stage ONLY files related to current task (git add <specific-files>)
├─ NEVER use "git add ." - always stage specific files
├─ Commit with conventional format
├─ Push if appropriate
└─ See commit format below
```

### Conventional Commit Format

Use this format for ALL commits:

```bash
<type>: <description> (Task X.Y)

[optional body with details]

[optional footer with breaking changes]
```

**Types:**
- `feat:` - New feature (Tasks 1.5, 2.1, 3.1, etc.)
- `fix:` - Bug fix
- `refactor:` - Code refactoring (no functionality change)
- `docs:` - Documentation only
- `test:` - Adding/updating tests
- `chore:` - Build process, dependencies, config

**Examples:**
```bash
# Simple commit
git commit -m "feat: generate discussion layer (Task 1.5)"

# With details
git commit -m "feat: implement Figma adapter (Task 3.2)

- Parse Figma email webhooks
- Extract comment threads
- Handle @mentions
- Support reply chains"

# Documentation update
git commit -m "docs: update PROGRESS_TRACKER with Task 1.5 completion"

# Multiple tasks bundled (avoid if possible)
git commit -m "feat: complete Phase 1 foundation (Tasks 1.5-1.6)

Generated collections and ran migrations"
```

### Using TodoWrite During Tasks

**ALWAYS use TodoWrite** for the 5-step workflow AND for general task management (see Section 4 above).

**For PROGRESS_TRACKER.md tasks** (5-step flow):
```typescript
TodoWrite([
  {
    content: "Mark Task X.Y in progress in PROGRESS_TRACKER.md",
    activeForm: "Marking task in progress",
    status: "in_progress"
  },
  {
    content: "Complete Task X.Y work",
    activeForm: "Completing task work",
    status: "pending"
  },
  {
    content: "Run npx nuxt typecheck",
    activeForm: "Running typecheck",
    status: "pending"
  },
  {
    content: "Update PROGRESS_TRACKER.md with completion",
    activeForm: "Updating progress tracker",
    status: "pending"
  },
  {
    content: "Commit: feat: [description] (Task X.Y)",
    activeForm: "Committing changes",
    status: "pending"
  }
])
```

**For general tasks** (outside PROGRESS_TRACKER.md):
Use TodoWrite to break down any complex multi-step task into trackable steps. See **Section 4: Task Management with TodoWrite** above for complete guidance, examples, and when to use it.

Mark each step complete as you go.

### Progress Tracker Updates

When updating `/docs/PROGRESS_TRACKER.md`:

1. **Task Status**: Change `[ ]` → `🔄` → `[x] ✅`
2. **Quick Stats Table**:
   ```markdown
   | Tasks Completed | 5 / 34 |  ← Increment
   | Hours Logged | 3.75 / 112 |  ← Add task hours
   ```
3. **Phase Progress**:
   ```markdown
   **Progress**: 5/6 tasks (83%)  ← Update percentage
   **Time**: 3.75h / 6h estimated  ← Update hours
   ```
4. **Daily Log**: Add entry with what was completed

### Example Complete Task Execution

**Task 1.5: Generate Collections**

```bash
# Step 1: Mark in progress
# (Edit PROGRESS_TRACKER.md, use TodoWrite)

# Step 2: Do the work
pnpm crouton generate

# Step 3: Typecheck
npx nuxt typecheck

# Step 4: Update tracker
# (Edit PROGRESS_TRACKER.md - mark complete, update stats)

# Step 5: Commit (stage only task-related files)
git add layers/discussion/ docs/PROGRESS_TRACKER.md
git commit -m "feat: generate discussion layer (Task 1.5)

Generated ~100 files for 4 collections:
- discussions (with embedded threadData)
- sourceConfigs
- syncJobs
- tasks

All files generated in layers/discussion/"

git push
```

### Multi-Agent Continuity

**When a new agent takes over:**

1. **ALWAYS read** `/docs/PROGRESS_TRACKER.md` first
2. Check which tasks are complete vs in progress
3. Read the Daily Log for context
4. Continue from the next pending task
5. Follow the same 5-step workflow

**When resuming work:**

1. Check git status to see what's uncommitted
2. If work is half-done, decide:
    - Complete and commit it, OR
    - Revert and restart from clean state
3. Update PROGRESS_TRACKER.md accordingly

### Critical Reminders

- ✅ **NEVER skip the commit step** - Every task = One commit
- ✅ **ALWAYS run typecheck** after code changes
- ✅ **ALWAYS update PROGRESS_TRACKER.md** before committing
- ✅ **ALWAYS use TodoWrite** to track the 5 steps
- ✅ **ALWAYS read PROGRESS_TRACKER.md** when starting
- ✅ **ONLY stage task-related files** - Use `git add <specific-files>`, never `git add .`
- ❌ **NEVER batch multiple tasks** in one commit (unless explicitly told)
- ❌ **NEVER commit without updating tracker** first
- ❌ **NEVER use `git add .`** - always specify exact files changed for the task

### Why This Workflow?

1. **Traceability**: Every task has a commit with clear history
2. **Resumability**: Any agent can pick up where another left off
3. **Accountability**: Progress tracker always reflects reality
4. **Quality**: Type checking catches errors early
5. **Communication**: Clear commit messages document decisions

### Context Clearing Between Tasks

**IMPORTANT**: To ensure fresh context and test workflow documentation, clear context after each task completion.

**Agent responsibilities:**
1. Complete all 5 workflow steps
2. Announce: **"✅ Task X.Y complete. Ready for context clear."**
3. Say the code word (found at the top of CLAUDE.md)
4. STOP and wait for user action
5. Do NOT continue to next task automatically

**Code word verification**: At the end of EVERY task completion, the agent MUST say the code word stated at the top of this file. This proves the agent has read CLAUDE.md and is following instructions.

**User action:**
```bash
# After agent announces completion
/clear

# Then in fresh session
continue with next task
```

**Fresh agent startup (after /clear):**
1. Read CLAUDE.md (automatic via claudeMd system)
2. Read `/docs/PROGRESS_TRACKER.md` FIRST
3. Check last completed task
4. Continue with next pending task
5. Follow the 5-step workflow

**Benefits of context clearing:**
- ✅ Tests that documentation is complete and clear
- ✅ Simulates multi-agent handoffs
- ✅ Ensures PROGRESS_TRACKER.md is the source of truth
- ✅ Catches missing documentation or unclear instructions
- ✅ Prevents context accumulation and token bloat

**Example flow:**
```
Agent: Completes Task 1.5, commits
Agent: "✅ Task 1.5 complete. Ready for context clear."
User: /clear
User: "continue with next task"
New Agent: Reads PROGRESS_TRACKER.md
New Agent: "I see Task 1.5 is complete. Starting Task 1.6..."
```

## Technology Stack

- **Framework**: Nuxt (latest version) - [Documentation](https://nuxt.com/docs)
- **Vue Syntax**: Composition API with `<script setup>` (MANDATORY - never use Options API)
- **UI Library**: Nuxt UI 4 (CRITICAL: Only v4, never v2/v3)
    - Common v4 changes: USeparator (not UDivider), USwitch (not UToggle), UDropdownMenu (not UDropdown), UToast (not UNotification)
- **Utilities**: VueUse (ALWAYS check VueUse first before implementing complex logic)
- **Hosting**: NuxtHub (Cloudflare edge)
- **Package Manager**: pnpm (ALWAYS use pnpm)
- **Architecture**: Domain-Driven Design with Nuxt Layers
- **Testing**: Vitest + Playwright

## MANDATORY: TypeScript Checking
**EVERY agent and Claude Code MUST run `npx nuxt typecheck` after making changes**
- Run after creating/modifying Vue components
- Run after changing TypeScript files
- Run before considering any task complete
- If typecheck fails, FIX the errors immediately
- Never use `pnpm typecheck` - ALWAYS use `npx nuxt typecheck`

## Core Principles

### 1. Simplicity Over Complexity (KISS)
- Start simple, add complexity only when proven necessary
- One domain = one layer (only if it helps)
- Avoid premature optimization
- **ALWAYS check VueUse composables first** before writing custom utilities
- Use built-in Nuxt features and composables
- Check Nuxt UI templates before building from scratch

### 2. Composables First, Readable Code Always
```typescript
// BEST: Use composables for reusable logic
const { users, loading, refresh } = useUsers()
const { filteredUsers } = useFilteredUsers(users)

// GOOD: Clear and readable inline logic
const activeUsers = users.filter(u => u.active)
const userNames = activeUsers.map(u => u.name)

// ALSO GOOD: When it's clearer
const results = []
for (const user of users) {
  if (user.active && user.verified) {
    results.push(processUser(user))
  }
}

// BAD: Over-engineered FP
const result = users
  .filter(compose(prop('active'), prop('verified')))
  .map(pipe(processUser, transform, validate))

// Keep it simple - prefer composables > readability > functional purity
```

### 3. Robust Error Handling
```typescript
// Always wrap async operations
try {
  const data = await $fetch('/api/endpoint')
  return { data, error: null }
} catch (error) {
  console.error('Operation failed:', error)
  return { data: null, error }
}
```

### 4. Frontend Excellence (Claude 4 Pattern)
When generating UI:
- **"Don't hold back. Give it your all."**
- Include hover states, transitions, micro-interactions
- Create impressive demonstrations of capabilities
- Apply design principles: hierarchy, contrast, balance
- Make it feel alive and responsive

### 5. General Solutions (Not Test-Specific)
```
Please write a high quality, general purpose solution.
Implement a solution that works correctly for all valid inputs,
not just the test cases.
```

## Nuxt Layers Architecture

```
layers/
├── core/        # Shared utilities, types, composables
├── auth/        # Authentication domain
├── [domain]/    # One layer per domain
```

Each layer is isolated with its own:
- nuxt.config.ts
- composables/
- components/
- server/api/
- types/

## CRITICAL: Nuxt UI 4 Component Patterns

### ⚠️ Component Name Changes (v3 → v4)
**YOU MUST USE THE V4 NAMES:**
- ❌ `UDropdown` → ✅ `UDropdownMenu`
- ❌ `UDivider` → ✅ `USeparator`
- ❌ `UToggle` → ✅ `USwitch`
- ❌ `UNotification` → ✅ `UToast`

### ❌ NEVER DO THIS (Old v2/v3 Patterns)
```vue
<!-- WRONG: v3 Modal with UCard inside -->
<UModal v-model="showModal">
  <UCard>
    <template #header>
      <h3>Title</h3>
    </template>
    Content here
    <template #footer>
      <UButton>Save</UButton>
    </template>
  </UCard>
</UModal>

<!-- WRONG: Old component names -->
<UDropdown /> <!-- Should be UDropdownMenu -->
<UDivider />  <!-- Should be USeparator -->
<UToggle />   <!-- Should be USwitch -->
```

### ✅ ALWAYS DO THIS (Correct v4 Patterns)

#### Vue Component Structure (MANDATORY)
```vue
<!-- ALWAYS use Composition API with script setup -->
<script setup lang="ts">
import { ref, computed } from 'vue'

// Props with TypeScript
interface Props {
  modelValue?: boolean
  title?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [data: any]
}>()

// Reactive state
const isOpen = ref(false)
const formData = ref({})

// Composables
const { user } = useAuth()
const { data, pending } = await useFetch('/api/data')

// Methods
const handleSave = () => {
  emit('save', formData.value)
}
</script>

<template>
  <!-- Template here -->
</template>
```

#### Modal (Most Common Mistake!)
```vue
<script setup lang="ts">
const isOpen = ref(false)
const handleSave = () => {
  // Save logic
  isOpen.value = false
}
</script>

<template>
  <!-- CORRECT: v4 Modal without UCard -->
  <UModal v-model="isOpen">
    <template #content="{ close }">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Modal Title</h3>
        <div class="space-y-4">
          <!-- Your content here -->
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <UButton color="gray" variant="ghost" @click="close">
            Cancel
          </UButton>
          <UButton color="primary" @click="handleSave">
            Save
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
```

#### Slideover
```vue
<script setup lang="ts">
const isOpen = ref(false)
</script>

<template>
  <!-- CORRECT: v4 Slideover -->
  <USlideover v-model="isOpen">
    <template #content="{ close }">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Slideover Title</h3>
        <!-- Content -->
        <UButton @click="close">Close</UButton>
      </div>
    </template>
  </USlideover>
</template>
```

#### Drawer
```vue
<script setup lang="ts">
const isOpen = ref(false)
</script>

<template>
  <!-- CORRECT: v4 Drawer -->
  <UDrawer v-model="isOpen">
    <template #content="{ close }">
      <div class="p-6">
        <!-- Content -->
      </div>
    </template>
  </UDrawer>
</template>
```

#### Forms
```vue
<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email')
})

const state = ref({
  email: ''
})

const onSubmit = (data: any) => {
  console.log('Form submitted:', data)
}
</script>

<template>
  <!-- CORRECT: Nuxt UI 4 -->
  <UForm :state="state" :schema="schema" @submit="onSubmit">
    <UFormField label="Email" name="email">
      <UInput v-model="state.email" />
    </UFormField>
  </UForm>
</template>
```

#### Correct Component Names
```vue
<script setup lang="ts">
const items = ref([])
const enabled = ref(false)
</script>

<template>
  <!-- CORRECT v4 names -->
  <UDropdownMenu :items="items" />
  <USeparator />
  <USwitch v-model="enabled" />
  <UToast :ui="{ position: 'top-right' }" />
</template>
```

## Testing Strategy

### Authentication Testing Setup
```typescript
// Mock auth for unit tests
vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref({ id: '1', email: 'test@example.com' }),
    isAuthenticated: ref(true)
  })
}))

// Playwright with auth
test.use({
  storageState: 'tests/.auth/user.json'
})
```

### Test Coverage Goals
- Unit: 80%+ for utilities/composables
- Integration: Critical API paths
- E2E: User journeys with Playwright

## Git Workflow (Solo Dev)

### Commit Messages (Conventional Commits)
```
feat: add user authentication
fix: resolve navigation bug
docs: update API documentation
refactor: simplify auth flow
test: add login e2e tests
chore: update dependencies
```

### Branch Strategy
```
main          # Production
feature/*     # New features
fix/*         # Bug fixes
experiment/*  # Explorations
```

## Development Commands

```bash
# Development
pnpm dev              # Start dev server (runs: nuxt dev)
pnpm build            # Production build (runs: nuxt build)
pnpm preview          # Preview build (runs: nuxt preview)

# Nuxt-Specific Commands (use npx nuxt [command])
npx nuxt dev          # Start development server
npx nuxt build        # Build for production
npx nuxt preview      # Preview production build
npx nuxt generate     # Generate static site
npx nuxt analyze      # Analyze bundle size
npx nuxt info         # Display project info
npx nuxt prepare      # Prepare project types
npx nuxt typecheck    # TypeScript checking (IMPORTANT: NOT 'pnpm typecheck'!)
npx nuxt cleanup      # Remove cache and temp files
npx nuxt upgrade      # Upgrade Nuxt and dependencies
npx nuxt add [module] # Add Nuxt modules

# Testing
pnpm test            # All tests
pnpm test:unit       # Unit only
pnpm test:e2e        # Playwright E2E

# Code Quality
pnpm lint            # ESLint
pnpm lint:fix        # Auto-fix
npx nuxt typecheck   # TypeScript (ALWAYS use this, never 'pnpm typecheck')

# NuxtHub
nuxthub deploy       # Deploy to edge
nuxthub dev          # Local with bindings
```

## State Management (No Pinia)

```typescript
// Use Nuxt's built-in state
export const useAppState = () => {
  return useState('app', () => ({
    user: null,
    settings: {}
  }))
}

// Server state with proper handling
const { data, pending, error, refresh } = await useFetch('/api/data')
```

## Performance Optimization

- Lazy load components: `<LazyComponent />`
- Use `v-memo` for expensive lists
- Implement loading skeletons
- Cache API responses appropriately
- Leverage edge caching on NuxtHub

## Sub-Agent Usage

When delegating to sub-agents:
1. **Template scout first** - Check existing solutions
2. **Parallel by default** - Run independent tasks simultaneously
3. **Clear boundaries** - Each agent gets one specific task
4. **Track activities** - Document decisions and outputs
5. **Smell check after** - Run code quality review

Example workflow:
```
@template-scout find dashboard examples
@nuxt-ui-builder adapt dashboard from template
@api-designer design metrics endpoint
@test-mock-specialist setup auth mocks
@code-smell-detector review implementation
/track feature "dashboard"
```

## Common Patterns

### API Error Handling
```typescript
export default defineEventHandler(async (event) => {
  try {
    // Validate input
    const body = await readValidatedBody(event, schema.parse)

    // Check auth
    const user = await requireAuth(event)

    // Business logic
    const result = await processRequest(body)

    return { success: true, data: result }
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message
    })
  }
})
```

### Component Testing
```typescript
describe('Component', () => {
  it('handles user interaction', async () => {
    const wrapper = mount(Component)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')).toBeTruthy()
  })
})
```

## CI/CD Recommendations

Start simple with GitHub Actions:
```yaml
name: Test & Deploy
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: nuxthub deploy
```

## Documentation Organization

### Agent Output Structure
When agents create documentation, briefings, or reports, they MUST follow this structure:

```
docs/
├── briefings/           # Task briefings and initial analyses
│   └── [feature-name]-brief.md
├── reports/            # Analysis reports and findings
│   └── [analysis-type]-report.md
├── guides/             # How-to guides and best practices
│   └── [topic]-guide.md
├── setup/              # Setup and configuration docs
│   └── [component]-setup.md
└── architecture/       # Architecture decisions and designs
    └── [domain]-architecture.md
```

### Agent Documentation Rules
1. **Briefings** → `docs/briefings/[feature-name]-brief.md`
2. **Audit Reports** → `docs/reports/[audit-type]-report.md`
3. **Technical Guides** → `docs/guides/[topic]-guide.md`
4. **Architecture Docs** → `docs/architecture/[domain]-architecture.md`
5. **Setup Instructions** → `docs/setup/[component]-setup.md`

### File Naming Convention
- Use kebab-case for all documentation files
- Include timestamp suffix for reports: `[name]-report-YYYYMMDD.md`
- Be descriptive but concise: `translation-audit-report.md` not `report.md`

### External Documentation Updates
**MANDATORY: After making changes to the codebase, ALWAYS check and update the external documentation.**

Documentation location: `apps/docs/content`

**Workflow:**
1. **Check for references** - Search the docs for mentions of what you changed
2. **Update documentation** - Modify any affected docs to reflect your changes

When you make changes to:
- Components → Check component docs for references, update component documentation
- APIs → Check API reference docs, update signatures and examples
- Features → Check feature guides for references, update workflows and examples
- Configuration → Check setup/config docs, update instructions
- File paths/structure → Search for hardcoded paths or structure references
- Function names → Search for usage examples and code snippets

**How to check:**
```bash
# Search for references in the docs (from project root)
grep -r "functionName" apps/docs/content
grep -r "ComponentName" apps/docs/content
grep -r "api/endpoint" apps/docs/content
```

This ensures the public-facing documentation stays in sync with the codebase.

## Agent Invocation with Custom Personalities

### The Challenge
Agent configuration files in `.claude/agents/*.md` define custom personalities and archetypes, but these aren't automatically inherited when agents are invoked via the Task tool. Each agent invocation is stateless and isolated.

### Solution: Include Personality in Task Prompts
When invoking agents that have custom personalities, you MUST include the personality definition in the prompt parameter:

```typescript
// ❌ WRONG: Agent won't use custom personality
Task(
  subagent_type: "code-smell-detector",
  prompt: "Analyze the Dashboard component for issues"
)

// ✅ CORRECT: Include the personality in the prompt
Task(
  subagent_type: "code-smell-detector",
  prompt: `You are Sal, a Brooklyn code plumber who's been fixing code for 30 years.
           Use plumbing metaphors like 'leaky abstractions' and 'clogged pipelines'.
           Say things like *adjusts tool belt* and reference your experience in Brooklyn.
           Now analyze the Dashboard component for code smells...`
)
```

### Agent Personality Reference

#### code-smell-detector - "Sal the Code Plumber"
**Personality**: Brooklyn plumber, 30 years experience, uses plumbing metaphors
**Voice**: "Hey there, I'm Sal. *Adjusts tool belt* Been fixing leaky abstractions in Brooklyn for decades."
**Key phrases**: "backed up worse than a Flatbush Avenue sewer", "wrong parts for the job", "gonna cost you down the line"
**Invocation example**:
```typescript
prompt: `You are Sal, a Brooklyn code plumber. Use plumbing metaphors, say things like
        *adjusts tool belt*, reference 30 years fixing code in Brooklyn. Now [task]...`
```

#### Other Agents (Professional Voice)
Most other agents use a professional, technical voice without specific personalities:
- **domain-architect**: DDD expert, formal technical voice
- **ui-builder**: Component specialist, focuses on beauty and accessibility
- **test-specialist**: Testing expert, comprehensive and methodical
- **api-designer**: API architect, precise and specification-focused
- **nuxt-architect**: Architecture expert, performance-oriented
- **typecheck-specialist**: Type safety enforcer, strict and thorough

For agents without custom personalities, use standard technical prompts focused on the task.

### Pattern for Agent Invocation

1. **Read the agent config** to understand intended personality
2. **Extract key personality traits** from the config
3. **Include personality in prompt** when invoking via Task tool
4. **Maintain consistency** across multiple invocations

Example workflow:
```bash
# First, check if agent has custom personality
cat .claude/agents/[agent-name].md

# Then include it when invoking
@agent-name "Act as [personality]. [actual task]"
```

## Maintaining AI Documentation (MANDATORY)

This codebase has AI-friendly documentation that MUST be kept in sync with code changes.

### When to Update AI Docs

| Change Type | What to Update |
|-------------|----------------|
| Add/modify composable | Package's `CLAUDE.md` (Key Files, Common Tasks) |
| Add/modify component | Package's `CLAUDE.md` (Key Files, Component Naming) |
| Add/change API endpoint | Package's `CLAUDE.md` (API Patterns) |
| Add generator feature | `packages/nuxt-crouton-cli/CLAUDE.md` |
| Change CLI command | Generator's `CLAUDE.md` + `.claude/skills/crouton.md` |
| Add new field type | `.claude/skills/crouton.md` (Field Types table) |
| Change auth connector | `packages/crouton-auth/CLAUDE.md` + Generator's CLAUDE.md |
| Add new package | Create `packages/{name}/CLAUDE.md` using existing as template |

### AI Documentation Files

```
CLAUDE.md (root)                    # Main project instructions (this file)
packages/*/CLAUDE.md                # Per-package AI context
.claude/skills/crouton.md           # Collection generation skill
```

### Package CLAUDE.md Structure

Each package CLAUDE.md should contain:
1. **Package Purpose** - One paragraph
2. **Key Files** - Table of important files
3. **Architecture/Patterns** - How it works
4. **Configuration** - Setup examples
5. **Common Tasks** - Step-by-step guides
6. **Dependencies** - What it extends/requires

### Generator AI Annotations

Generated files include `@crouton-generated` headers with AI context. These are **automatic** - no manual updates needed. The annotations include:
- Collection and layer info
- Related files (composables, components, API)
- Common modification hints

### Update Checklist

After making significant changes, verify:
- [ ] Package `CLAUDE.md` reflects new/changed exports
- [ ] New composables/components are listed in Key Files
- [ ] API changes are documented
- [ ] If CLI changed, skill file is updated
- [ ] New packages have their own `CLAUDE.md`

### Example: Adding a Composable

1. Create the composable in `app/composables/useNewFeature.ts`
2. Update package's `CLAUDE.md`:
   ```markdown
   | `app/composables/useNewFeature.ts` | Description of what it does |
   ```
3. Add to Common Tasks if it's a key workflow

## Claude Code Configuration

This project uses Claude Code skills, agents, and custom configurations.

### Available Artifacts

| Type | File | Purpose | Update When |
|------|------|---------|-------------|
| Skill | `.claude/skills/crouton.md` | Collection generation workflow | Field types, commands, workflow change |
| Agent | `.claude/agents/sync-checker.md` | Verifies doc sync across artifacts | Sync rules change |
| Settings | `.claude/settings.local.json` | Project-specific permissions | New tools needed |
| MCP Server | `packages/crouton-mcp-server/` | AI-powered collection generation | CLI commands, field types change |

### Skills

**crouton.md** - Triggers when user mentions:
- "create a collection", "generate crud", "scaffold"
- Guides Claude through schema creation and generation
- Contains field type reference and examples

### Agents

**sync-checker** - Invoke after modifying generator:
- Extracts field types and CLI commands from source
- Compares with all documentation artifacts
- Reports mismatches and suggests fixes

Usage:
```
Use the sync-checker agent to verify all generator documentation is in sync.
```

### When to Update These Files

| Change | Update Required |
|--------|-----------------|
| Add field type | `crouton.md` (Field Types table), MCP Server field types |
| Add CLI command | `crouton.md` (commands reference), MCP Server tools |
| Change sync rules | `sync-checker.md` |
| Add new agent | This section + agent file |
| Add new skill | This section + skill file |
| Add MCP tool | MCP Server package + this section |

### MCP Server

The Crouton MCP Server (`packages/crouton-mcp-server/`) enables AI assistants to generate collections through a structured interface.

**Tools Available:**

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `design_schema` | Get field types and schema guidelines | First - before creating schema |
| `validate_schema` | Validate schema structure | After designing, before generating |
| `generate_collection` | Execute collection generation | After validation passes |
| `list_collections` | List existing collections | To understand project structure |
| `list_layers` | List available layers | To choose target layer |

**Resources Available:**

| URI | Description |
|-----|-------------|
| `crouton://field-types` | Markdown field type reference |
| `crouton://field-types/json` | JSON field type definitions |
| `crouton://schema-template` | Example schema template |

**Configuration:**

The MCP server is registered in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "crouton": {
      "command": "node",
      "args": ["./packages/crouton-mcp-server/dist/index.js"]
    }
  }
}
```

**Usage Flow:**
1. AI calls `design_schema` with collection description
2. AI creates schema based on field type reference
3. AI calls `validate_schema` to check schema structure
4. AI calls `generate_collection` to execute generation

See `packages/crouton-mcp-server/CLAUDE.md` for detailed documentation

## MCP Improvement Capture

**When working on any task, consider if it reveals an MCP improvement opportunity:**

- Is there repetitive work an MCP **tool** could automate?
- Is there documentation an MCP **resource** could expose?
- Is there a workflow an MCP **prompt** could guide?

**If yes, capture the idea:**
1. Use `/mcp-idea <description>` slash command, OR
2. Add manually to `.claude/mcp-ideas.md`

**MCP Servers in this project:**
| Server | Location | Purpose |
|--------|----------|---------|
| CLI MCP | `packages/crouton-mcp-server/` | AI assistants interact with CLI |
| Docs MCP | `apps/docs/server/mcp/` | AI assistants read documentation |

Ideas feed into both servers. High-priority ideas should be implemented in the next development cycle.

## Key Reminders

1. **Check Nuxt MCP first** - Always, no exceptions
2. **Run `npx nuxt typecheck`** - After EVERY change, no exceptions
3. **Use TodoWrite for complex tasks** - ANY task with 3+ steps requires TodoWrite (see Section 4)
4. **Use Composition API** - ALWAYS use `<script setup lang="ts">`, never Options API
5. **Parallel when possible** - Don't sequence independent tasks
6. **One domain = one layer** - Keep isolation
7. **Test as you code** - Not after
8. **Keep it simple** - You're working solo
9. **Make it impressive** - UI should feel alive
10. **General solutions** - Not test-specific hacks
11. **Document in correct folder** - Follow docs/ structure above
12. **Include agent personalities** - When using Task tool, pass personality in prompt
13. **Update AI docs** - Keep CLAUDE.md files in sync with code changes (see above)

---

*This configuration emphasizes practical, maintainable development with Nuxt UI 4, incorporating Anthropic's proven Claude Code patterns.*
