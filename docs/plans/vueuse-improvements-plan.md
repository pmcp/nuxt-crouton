# VueUse Improvements Plan

**Created:** 2026-02-20
**Source:** [VueUse audit — full codebase sweep across 25 packages]
**Scope:** Replace custom implementations with VueUse composables across `packages/`

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total tasks | 28 |
| Completed | 0 |
| In progress | 0 |
| Remaining | 28 |
| Phase | 1 — High priority |

---

## Already Good ✅ (no action needed)

| File | VueUse usage |
|------|-------------|
| `crouton-core/app/composables/useTableSearch.ts` | `useDebounceFn` ✅ |
| `crouton-core/app/components/DropZone.vue` | `useDropZone` ✅ |
| `crouton-core/app/components/DarkModeSwitcher.vue` | `useColorMode` ✅ |
| `crouton-ai/app/components/Message.vue` | `useClipboard` ✅ |
| `crouton-bookings/app/composables/useBookingCart.ts` | `useLocalStorage` ✅ |

---

## Phase 1 — High Priority (memory leak risk)

### Group A: `useTimeoutFn` — replace manual setTimeout (10 files)

Manual `setTimeout` + null-tracking can silently leak if component unmounts before the timer fires. `useTimeoutFn` auto-cancels on unmount.

| # | File | What to change | Status |
|---|------|---------------|--------|
| 1A-1 | `crouton-core/app/composables/useExpandableSlideover.ts` | Animation close delays | [ ] |
| 1A-2 | `crouton-core/app/components/ImportPreviewModal.vue` | State reset after modal close | [ ] |
| 1A-3 | `crouton-core/app/components/FormExpandableSlideOver.vue` | `setTimeout(() => close(), 300)` | [ ] |
| 1A-4 | `crouton-core/app/composables/useTreeItemState.ts` | Two flash animation timeouts | [ ] |
| 1A-5 | `crouton-core/app/composables/useTreeDrag.ts` | `expandTimeouts` dictionary | [ ] |
| 1A-6 | `crouton-ai/app/components/Message.vue` | `setTimeout(() => { copied.value = false }, 2000)` | [ ] |
| 1A-7 | `crouton-collab/app/composables/useCollabPresence.ts` | `setTimeout(() => sendCurrentState(), 100)` in watcher | [ ] |
| 1A-8 | `crouton-i18n/app/components/DevModeToggle.vue` | `setTimeout(scanForMissingTranslations, 100)` | [ ] |
| 1A-9 | `crouton-email/app/components/Email/MagicLinkSent.vue` | `setTimeout(() => { isResending.value = false }, 1000)` | [ ] |
| 1A-10 | `crouton-flow/app/components/Flow.vue` | `ghostCleanupTimeout` with null-tracking | [ ] |

**Pattern:**
```ts
// Before
let timer: ReturnType<typeof setTimeout> | null = null
timer = setTimeout(() => { state.value = false }, 300)

// After
const { start } = useTimeoutFn(() => { state.value = false }, 300)
```

---

### Group B: `useIntervalFn` / `useCountDown` — replace manual setInterval (3 files)

| # | File | What to change | Status |
|---|------|---------------|--------|
| 1B-1 | `crouton-admin/app/composables/useAdminStats.ts` | `startAutoRefresh`/`stopAutoRefresh` (~20 lines) | [ ] |
| 1B-2 | `crouton-collab/app/composables/useCollabRoomUsers.ts` | `startPolling`/`stopPolling` (~20 lines) | [ ] |
| 1B-3 | `crouton-email/app/components/Email/ResendButton.vue` | Manual countdown → `useCountDown` | [ ] |

**Pattern:**
```ts
// Before (~20 lines)
let timer: ReturnType<typeof setInterval> | null = null
function start() { timer = setInterval(() => fetch(), 5000) }
function stop() { if (timer) { clearInterval(timer); timer = null } }
onUnmounted(() => stop())

// After
const { pause, resume } = useIntervalFn(() => fetch(), 5000, { immediate: false })
```

---

## Phase 2 — Medium Priority (code quality)

### Group C: `useToggle` — replace boolean ref + toggle function (5 files)

| # | File | What to change | Status |
|---|------|---------------|--------|
| 2C-1 | `crouton-core/app/composables/useExpandableSlideover.ts` | `isExpanded` ref + manual toggle (9 lines → 1) | [ ] |
| 2C-2 | `crouton-ai/app/components/AITranslateButton.vue` | `showConfirmModal`, `showContextSelector` | [ ] |
| 2C-3 | `crouton-assets/app/components/Picker.vue` | `isOpen`, `showUploader` | [ ] |
| 2C-4 | `crouton-events/app/components/CroutonActivityLog.vue` | `showDetail` | [ ] |
| 2C-5 | `crouton-devtools/src/runtime/client/pages/index.vue` | `showDetailModal` | [ ] |

**Pattern:**
```ts
// Before
const isOpen = ref(false)
function toggle() { isOpen.value = !isOpen.value }

// After
const [isOpen, toggleOpen] = useToggle(false)
```

---

### Group D: `useEventListener` — replace manual add/remove (2 files)

| # | File | What to change | Status |
|---|------|---------------|--------|
| 2D-1 | `crouton-i18n/app/components/DevModeToggle.vue` | `document.addEventListener('click', handleClick, true)` + manual remove | [ ] |
| 2D-2 | `crouton-triage/app/composables/useTriageOAuth.ts` | `window.addEventListener('message', handler)` in lifecycle hooks | [ ] |

**Pattern:**
```ts
// Before
onMounted(() => window.addEventListener('message', handler))
onBeforeUnmount(() => window.removeEventListener('message', handler))

// After
useEventListener(window, 'message', handler)
```

---

### Group E: `useDebounceFn` / `useThrottleFn` — replace manual implementations (4 files)

| # | File | What to change | Status |
|---|------|---------------|--------|
| 2E-1 | `crouton-flow/app/composables/useFlowMutation.ts` | Manual setTimeout debounce for position updates | [ ] |
| 2E-2 | `crouton-flow/app/components/Flow.vue` | Manual `Date.now()` throttle for drag sync | [ ] |
| 2E-3 | `crouton-charts/app/composables/useCollectionChart.ts` | No debounce on rapid options changes → add `useDebounceFn` | [ ] |
| 2E-4 | `crouton-devtools/src/runtime/client/pages/index.vue` | Search filter recomputes on every keystroke → add `useDebounceFn` | [ ] |

---

## Phase 3 — Low Priority (nice-to-have)

### Group F: One-liners

| # | File | What to change | VueUse composable | Status |
|---|------|---------------|-------------------|--------|
| 3F-1 | `crouton-devtools/src/runtime/client/components/CollectionDetailModal.vue` | Manual computed get/set v-model (4 lines) | `useVModel` | [ ] |
| 3F-2 | `crouton-core/app/composables/useCroutonShortcuts.ts` | `navigator.platform` check | `useOS` | [ ] |
| 3F-3 | `crouton-ai/app/components/AITranslateButton.vue` | `// Force reactivity` Set reassignment hack | `reactive()` Set | [ ] |
| 3F-4 | `crouton-collab/app/composables/useFormCollabPresence.ts` | `ref(new Map())` | `useMap` | [ ] |

### Group G: Bigger refactors

| # | File | What to change | VueUse composable | Status |
|---|------|---------------|-------------------|--------|
| 3G-1 | `crouton-pages/app/composables/useReorderMode.ts` | Manual snapshot/undo with `structuredClone` | `useRefHistory` | [ ] |
| 3G-2 | `crouton-core/app/composables/useCollectionItem.ts` | Manual loading/error/data trio (~35 lines) | `useAsyncState` | [ ] |
| 3G-3 | `crouton-maps/app/composables/useGeocode.ts` | Duplicate loading/error state in two functions | `useAsyncState` | [ ] |
| 3G-4 | `crouton-maps/app/composables/useMap.ts` | Manual `isLoaded` + Promise wrapper | `useAsyncState` | [ ] |
| 3G-5 | `crouton-devtools/src/runtime/client/composables/useCroutonCollections.ts` | Manual fetch with loading/error/data | `useAsyncState` | [ ] |
| 3G-6 | `crouton-assets/app/composables/useAssetUpload.ts` | `uploading`/`error`/`progress` trio | `useAsyncState` | [ ] |

---

## Commit Convention

Each group = one commit:
```
chore(crouton-core): replace setTimeout with useTimeoutFn
chore(crouton-collab): replace setInterval with useIntervalFn
chore(crouton-core): replace toggle patterns with useToggle
...
```
