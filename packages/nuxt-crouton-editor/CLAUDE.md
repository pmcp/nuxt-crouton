# CLAUDE.md - @friendlyinternet/nuxt-crouton-editor

## Package Purpose

Rich text editor addon for Nuxt Crouton. Wraps Nuxt UI's `UEditor` (TipTap-based) with full feature parity and Crouton-specific defaults.

## Key Files

| File | Purpose |
|------|---------|
| `app/components/Simple.vue` | `CroutonEditorSimple` - Full-featured UEditor wrapper |
| `nuxt.config.ts` | Layer configuration |

## Components

### CroutonEditorSimple

Full-featured wrapper around Nuxt UI's `UEditor` component.

```vue
<!-- Basic usage -->
<CroutonEditorSimple
  v-model="content"
  placeholder="Start writing..."
/>

<!-- With content type -->
<CroutonEditorSimple
  v-model="content"
  content-type="markdown"
/>

<!-- With custom toolbar via slot -->
<CroutonEditorSimple v-model="content">
  <template #default="{ editor, handlers }">
    <UEditorToolbar :editor="editor" :handlers="handlers" />
  </template>
</CroutonEditorSimple>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string \| null` | `''` | Content (v-model) |
| `placeholder` | `string` | - | Placeholder text |
| `contentType` | `'html' \| 'markdown' \| 'json'` | `'html'` | Output format |
| `starterKit` | `object` | - | TipTap StarterKit options |
| `extensions` | `array` | - | Additional TipTap extensions |
| `editable` | `boolean` | `true` | Enable/disable editing |
| `autofocus` | `boolean \| 'start' \| 'end' \| 'all' \| number` | - | Focus behavior |
| `markdown` | `object` | - | Markdown extension options |
| `image` | `object` | - | Image extension options |
| `mention` | `object` | - | Mention extension options |
| `handlers` | `object` | - | Custom handlers |
| `ui` | `object` | `{ root: 'h-full', content: 'h-full' }` | Style customization |

**Events:**

- `@create` - Editor created
- `@update` - Content updated
- `@focus` - Editor focused
- `@blur` - Editor blurred

**Slots:**

- `default` - `{ editor, handlers }` - For custom toolbars

### Using Nuxt UI Editor Directly

For full control, use `UEditor` directly:

```vue
<UEditor
  v-slot="{ editor, handlers }"
  v-model="content"
  content-type="html"
>
  <UEditorToolbar :editor="editor" :handlers="handlers" />
  <UEditorSuggestionMenu :editor="editor" :handlers="handlers" />
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
- Image handling
- Code blocks with syntax highlighting

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],  // Required (v3.4.0+)
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
Use the default slot with `UEditorToolbar`:

```vue
<CroutonEditorSimple v-model="content">
  <template #default="{ editor, handlers }">
    <UEditorToolbar
      :editor="editor"
      :handlers="handlers"
      :items="['bold', 'italic', 'link']"
    />
  </template>
</CroutonEditorSimple>
```

### Add custom slash commands
Use `UEditorSuggestionMenu` in the slot:

```vue
<CroutonEditorSimple v-model="content">
  <template #default="{ editor, handlers }">
    <UEditorSuggestionMenu :editor="editor" :handlers="handlers" />
  </template>
</CroutonEditorSimple>
```

### Markdown editing
Set `content-type="markdown"`:

```vue
<CroutonEditorSimple v-model="markdownContent" content-type="markdown" />
```

### Read-only mode
Set `:editable="false"`:

```vue
<CroutonEditorSimple v-model="content" :editable="false" />
```

## Migration from v1.x

```vue
<!-- Before (still works!) -->
<CroutonEditorSimple v-model="content" />

<!-- After (with new features) -->
<CroutonEditorSimple
  v-model="content"
  content-type="markdown"
  :editable="isEditing"
/>
```

**Breaking changes in v2.x:**
- `CroutonEditorToolbar` component removed (use `UEditorToolbar` via slot instead)

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton`
- **Requires**: `@nuxt/ui ^3.4.0` (provides TipTap integration)
- **Peer deps**: `@nuxt/icon ^1.0.0`

## Documentation

- [Nuxt UI Editor](https://ui.nuxt.com/docs/components/editor)
- [Editor Toolbar](https://ui.nuxt.com/docs/components/editor-toolbar)
- [Editor Suggestion Menu](https://ui.nuxt.com/docs/components/editor-suggestion-menu)

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
