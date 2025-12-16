# CLAUDE.md - @friendlyinternet/nuxt-crouton-editor

## Package Purpose

Rich text editor addon for Nuxt Crouton. Wraps Nuxt UI's `UEditor` (TipTap-based) with Crouton-specific defaults and a backwards-compatible simple editor component.

## Key Files

| File | Purpose |
|------|---------|
| `app/components/Simple.vue` | `CroutonEditorSimple` - Basic editor |
| `nuxt.config.ts` | Layer configuration |

## Components

### CroutonEditorSimple (Backwards Compatible)

```vue
<CroutonEditorSimple
  v-model="content"
  placeholder="Start writing..."
  content-type="html"
/>
```

**Props:**
- `modelValue` - HTML/Markdown content (v-model)
- `placeholder` - Placeholder text
- `contentType` - `'html'` | `'markdown'` | `'json'`

### Using Nuxt UI Editor Directly (Recommended)

```vue
<UEditor
  v-slot="{ editor }"
  v-model="content"
  content-type="html"
>
  <UEditorToolbar :editor="editor" :items="toolbarItems" layout="bubble" />
  <UEditorSuggestionMenu :editor="editor" :items="slashItems" />
  <UEditorDragHandle :editor="editor" />
</UEditor>
```

## Features (via Nuxt UI)

- Slash commands (`/`)
- Mentions (`@`)
- Emoji picker (`:`)
- Drag & drop blocks
- Multiple toolbar layouts (fixed, bubble, floating)
- Markdown native support

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],  // Required
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-editor'
  ]
})
```

## Component Naming

Components auto-import with `CroutonEditor` prefix:
- `Simple.vue` → `<CroutonEditorSimple />`

## Common Tasks

### Add custom toolbar items
Use `UEditorToolbar` with custom `items` array directly.

### Add custom slash command
Use `UEditorSuggestionMenu` with custom `items`.

## Migration from v1.x

```vue
<!-- Before (still works) -->
<CroutonEditorSimple v-model="content" />

<!-- After (full features) -->
<UEditor v-model="content" content-type="html" />
```

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton`
- **Requires**: `@nuxt/ui ^4.0.0` (provides TipTap integration)
- **Peer deps**: `@nuxt/icon ^1.0.0`

## Documentation

- [Nuxt UI Editor](https://ui.nuxt.com/docs/components/editor)
- [Editor Toolbar](https://ui.nuxt.com/docs/components/editor-toolbar)
- [Editor Suggestion Menu](https://ui.nuxt.com/docs/components/editor-suggestion-menu)

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
