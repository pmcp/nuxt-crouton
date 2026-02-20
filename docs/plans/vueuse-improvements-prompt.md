# Multi-Agent Prompt: VueUse Improvements

> Paste this entire message into a new Claude Code session to kick off parallel implementation.

---

Implement the VueUse improvements from `docs/plans/vueuse-improvements-plan.md`. Launch 5 agents in parallel — one per group. Each agent should: read the plan, implement the changes for its group, run `npx nuxt typecheck`, and commit using the `/commit` skill.

**IMPORTANT rules for every agent:**
- Read each file before editing — never guess at code
- Only change the specific patterns listed; don't refactor surrounding code
- After changes, run `npx nuxt typecheck` and fix any type errors before committing
- One commit per group (see commit convention at bottom of plan)
- Mark tasks complete in the plan file as you go

---

**Agent 1 — Group A: `useTimeoutFn` sweep (crouton-core, crouton-ai, crouton-collab, crouton-i18n, crouton-email, crouton-flow)**

Handle tasks 1A-1 through 1A-10 from `docs/plans/vueuse-improvements-plan.md`.

Replace every manual `setTimeout`/`clearTimeout` with `useTimeoutFn` from `@vueuse/core`. Import: `import { useTimeoutFn } from '@vueuse/core'`. The pattern is:
```ts
// Before
let timer: ReturnType<typeof setTimeout> | null = null
timer = setTimeout(() => { state.value = false }, 300)
// (sometimes with onUnmounted cleanup)

// After
const { start } = useTimeoutFn(() => { state.value = false }, 300, { immediate: false })
// call start() where the old setTimeout was called
```
For `useTreeDrag.ts` the `expandTimeouts` dictionary is more complex — create one `useTimeoutFn` per item ID inside the drag handler, replacing the manual dict.

After all changes: `npx nuxt typecheck`, fix errors, commit with `/commit`.

---

**Agent 2 — Group B: `useIntervalFn` / `useCountDown` (crouton-admin, crouton-collab, crouton-email)**

Handle tasks 1B-1 through 1B-3 from `docs/plans/vueuse-improvements-plan.md`.

- `useAdminStats.ts`: Replace `startAutoRefresh`/`stopAutoRefresh` with `useIntervalFn`. Import: `import { useIntervalFn } from '@vueuse/core'`. Return `{ pause: pauseRefresh, resume: startAutoRefresh }` or adapt the public API as needed.
- `useCollabRoomUsers.ts`: Same pattern — replace `startPolling`/`stopPolling` with `useIntervalFn`.
- `ResendButton.vue`: Replace the manual countdown `setInterval` with `useCountDown` from `@vueuse/core`. API: `const { count, pause, resume, reset } = useCountDown(props.cooldown)`.

After all changes: `npx nuxt typecheck`, fix errors, commit with `/commit`.

---

**Agent 3 — Group C + D: `useToggle` + `useEventListener` (crouton-core, crouton-ai, crouton-assets, crouton-events, crouton-devtools, crouton-i18n, crouton-triage)**

Handle tasks 2C-1 through 2C-5 and 2D-1 through 2D-2 from `docs/plans/vueuse-improvements-plan.md`.

**useToggle** — `import { useToggle } from '@vueuse/core'`:
```ts
// Before
const isOpen = ref(false)
function toggle() { isOpen.value = !isOpen.value }
// After
const [isOpen, toggleOpen] = useToggle(false)
```

**useEventListener** — `import { useEventListener } from '@vueuse/core'`:
```ts
// Before
onMounted(() => window.addEventListener('message', handler))
onBeforeUnmount(() => window.removeEventListener('message', handler))
// After
useEventListener(window, 'message', handler)
```
For `DevModeToggle.vue` the listener needs to be conditional (only active when dev mode is on). Use `useEventListener` with a ref target or manually call the returned cleanup:
```ts
const stop = useEventListener(document, 'click', handleClick, { capture: true })
// call stop() in stopDetection, re-register in startDetection if needed
```

After all changes: `npx nuxt typecheck`, fix errors, commit with `/commit`.

---

**Agent 4 — Group E: `useDebounceFn` / `useThrottleFn` (crouton-flow, crouton-charts, crouton-devtools)**

Handle tasks 2E-1 through 2E-4 from `docs/plans/vueuse-improvements-plan.md`.

Import: `import { useDebounceFn, useThrottleFn } from '@vueuse/core'`

- `useFlowMutation.ts`: The manual debounce is a closure tracking `timeoutId`. Replace with `useDebounceFn(async (id, position) => { ... }, delay)` where `delay` is the existing constant.
- `Flow.vue` drag throttle: Replace `lastDragSync` + `Date.now()` check with `useThrottleFn`.
- `useCollectionChart.ts`: Wrap the `fetchAndTransform` call in the watcher with `useDebounceFn` (300ms) to prevent re-fetching on every rapid options change.
- `crouton-devtools/pages/index.vue`: The `filteredCollections` computed is fine, but if there's a search input handler that triggers API calls, debounce that. If it's purely computed filtering (no fetch), skip this one.

After all changes: `npx nuxt typecheck`, fix errors, commit with `/commit`.

---

**Agent 5 — Group F: One-liners (crouton-devtools, crouton-core, crouton-ai, crouton-collab)**

Handle tasks 3F-1 through 3F-4 from `docs/plans/vueuse-improvements-plan.md`.

- **3F-1** `CollectionDetailModal.vue` — `useVModel`: `import { useVModel } from '@vueuse/core'` → `const isOpen = useVModel(props, 'modelValue', emit)`
- **3F-2** `useCroutonShortcuts.ts` — `useOS`: `import { useOS } from '@vueuse/core'` → `const { isMac } = useOS()` replacing the `navigator.platform` check
- **3F-3** `AITranslateButton.vue` — reactive Set: Change `selectedContextLocales` from `ref(new Set())` to `reactive(new Set())`. Remove the `// Force reactivity` reassignment line. Update all `.value` accesses to direct access (since `reactive` doesn't need `.value`).
- **3F-4** `useFormCollabPresence.ts` — `useMap`: `import { useMap } from '@vueuse/core'` → replace `ref(new Map())` with `useMap()`; update call sites to use the `useMap` API (`map.set(k,v)`, `map.get(k)`, `map.delete(k)` — same API as native Map, just reactive).

After all changes: `npx nuxt typecheck`, fix errors, commit with `/commit`.

---

> Phase 3 Group G (`useRefHistory`, `useAsyncState`) is intentionally excluded — those are larger refactors that should be done separately with more context.
