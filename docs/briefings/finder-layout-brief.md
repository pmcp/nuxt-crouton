a# Briefing: Finder-Style Pages Layout

## Context

We're building a Finder/Notion-style content workspace for the `crouton-pages` package. The user manages pages in a split-view layout where the left sidebar shows a page tree and the right side shows the selected page's editor inline (not in a slideover).

## What Already Exists

The crouton-pages package already has:

1. **Page tree with hierarchy** - Parent/child relationships via `parentId` field
2. **Page types** - Regular pages and app-specific types (e.g., Bookings Calendar)
3. **Block-based editor** - TipTap editor with page blocks (hero, section, CTA, etc.)
4. **Admin tree view** - `/admin/[team]/pages` uses `CroutonCollection` with `layout="tree"`
5. **Form component** - `CroutonPagesForm` for editing pages (currently opens in slideover)

### Key Files

| File | Purpose |
|------|---------|
| `packages/crouton-pages/app/pages/admin/[team]/pages.vue` | Current admin page list |
| `packages/crouton-pages/app/components/Form.vue` | Page form (CroutonPagesForm) |
| `packages/crouton-pages/app/components/Card.vue` | Tree card display |
| `packages/crouton-pages/app/components/Editor/BlockEditor.vue` | Block editor |
| `packages/crouton-core/app/composables/useCrouton.ts` | Modal/slideover state |

## What Needs to Be Built

A new layout/view that shows:

```
┌─────────────────────────────────────────────────────────────┐
│  [Header: Create Page button, Search]                       │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│  Pages Tree      │   Page Editor                            │
│  (sidebar)       │   (what's currently in slideover,        │
│                  │    but rendered inline)                  │
│  - Home          │                                          │
│  - About         │   [Form fields, block editor, etc.]      │
│  - Bookings      │                                          │
│    └─ Calendar   │                                          │
│  - Contact       │                                          │
│                  │                                          │
│  [+ New Page]    │                                          │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### Behavior

1. **Click page in tree** → Load that page's form in the right panel
2. **Create new page** → Show empty form in right panel
3. **Save** → Save inline (no modal close needed)
4. **Tree stays visible** → User can switch between pages quickly
5. **No slideover** → Editor is always visible in right panel

### Technical Approach

**Option A: New page component**
Create a new page at `/admin/[team]/workspace` (or similar) that:
- Uses a two-column layout
- Left: Renders page tree using existing `CroutonPagesCard` or custom tree
- Right: Renders `CroutonPagesForm` directly (not via `useCrouton().open()`)
- Manages selected page state locally

**Option B: Alternative view mode**
Add a "workspace" view mode to the existing `/admin/[team]/pages` that toggles between:
- Table/tree view (current)
- Finder view (new)

### Key Implementation Details

1. **Don't use slideover** - Render form inline instead of `crouton.open('edit', ...)`
2. **Keep tree in sync** - When page is saved, tree should update
3. **Handle unsaved changes** - Warn before switching pages with unsaved work
4. **Preserve URL state** - URL should reflect selected page (e.g., `?page=abc123`)
5. **Responsive** - On mobile, could collapse to single column

### Components to Create/Modify

1. **New: `WorkspaceLayout.vue`** - Split panel layout component
2. **New: `PagesSidebar.vue`** - Tree sidebar with search and create button
3. **Modify: `Form.vue`** - May need to work without slideover context
4. **New page or view toggle** - Entry point for the workspace

## Existing Patterns to Follow

### Tree rendering (from Card.vue)
```vue
<CroutonCollection
  collection="pagesPages"
  layout="tree"
  :columns="['title', 'slug', 'pageType', 'status']"
/>
```

### Form usage
```vue
<CroutonPagesForm
  :model-value="selectedPage"
  @update:model-value="handleSave"
/>
```

### Page query
```typescript
const { data: pages } = await useCollectionQuery('pagesPages', {
  teamId: teamId.value,
  orderBy: [{ field: 'depth' }, { field: 'order' }]
})
```

## Out of Scope (for now)

- Drag-to-reorder in tree (can be added later)
- Inline title editing (can be added later)
- Multi-select pages
- Page duplication

## Questions to Consider

1. Should this replace the current pages admin or be an additional view?
2. Should the URL be `/admin/[team]/pages` with a view toggle, or a new route like `/admin/[team]/workspace`?
3. How should "Create Page" work - inline in right panel or modal for initial setup?

## Definition of Done

- [ ] Split layout with resizable panels
- [ ] Page tree in left sidebar
- [ ] Selected page editor in right panel
- [ ] Create new page functionality
- [ ] Save works without closing anything
- [ ] Tree updates when page is saved
- [ ] Works on the existing pages collection