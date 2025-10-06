# Nuxt Crouton Editor

Rich text editor addon layer for Nuxt Crouton, powered by Tiptap.

## Features

- 🎨 **WYSIWYG Editor** - Beautiful, accessible rich text editing
- ⚡ **Auto-configured** - Tiptap extensions pre-configured and ready to use
- 🧩 **Modular** - Optional addon layer for Nuxt Crouton
- 🎯 **Type-safe** - Full TypeScript support
- 🌙 **Dark Mode** - Automatic dark mode support

## Installation

### 1. Install the package

```bash
pnpm add @friendlyinternet/nuxt-crouton-editor
# or
npm install @friendlyinternet/nuxt-crouton-editor
# or
yarn add @friendlyinternet/nuxt-crouton-editor
```

### 2. Add to your Nuxt config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-editor'  // Add this
  ]
})
```

### 3. Install peer dependencies

```bash
pnpm add @nuxt/icon
```

## Components

### CroutonEditorSimple

A fully-featured rich text editor with toolbar and formatting options.

```vue
<template>
  <div>
    <CroutonEditorSimple v-model="content" />
  </div>
</template>

<script setup lang="ts">
const content = ref('<p>Hello world!</p>')
</script>
```

**Features:**
- Text formatting (bold, italic, strikethrough)
- Headings (H1, H2, H3)
- Lists (bullet, numbered)
- Code blocks
- Blockquotes
- Text colors
- Floating toolbar on text selection

### CroutonEditorToolbar

The toolbar component (used internally by CroutonEditorSimple, but can be used standalone).

```vue
<template>
  <CroutonEditorToolbar :editor="editor" />
</template>

<script setup lang="ts">
const editor = useEditor({
  content: '<p>Content</p>',
  extensions: [TiptapStarterKit]
})
</script>
```

## Usage with Nuxt Crouton Forms

Integrate the editor into your Crouton collection forms:

```vue
<!-- components/PostsForm.vue -->
<template>
  <UForm :state="formData" @submit="handleSubmit">
    <UFormField label="Title" name="title">
      <UInput v-model="formData.title" />
    </UFormField>

    <UFormField label="Content" name="content">
      <CroutonEditorSimple v-model="formData.content" />
    </UFormField>

    <UButton type="submit">Save Post</UButton>
  </UForm>
</template>

<script setup lang="ts">
const props = defineProps(['action', 'activeItem'])
const { send } = useCrouton()

const formData = ref({
  title: props.activeItem?.title || '',
  content: props.activeItem?.content || '<p></p>'
})

const handleSubmit = () => {
  send(props.action, 'posts', formData.value)
}
</script>
```

## Generated Collection Integration

When using the Nuxt Crouton generator with rich text fields, update your schema:

```json
{
  "content": {
    "type": "text",
    "meta": {
      "label": "Content",
      "component": "CroutonEditorSimple"
    }
  }
}
```

Then the generated form will automatically use the rich text editor for that field.
is 
## Customization

### Custom Styling

The editor respects your Nuxt UI theme and includes dark mode support out of the box. You can override styles:

```vue
<CroutonEditorSimple
  v-model="content"
  class="my-custom-editor"
/>

<style>
.my-custom-editor :deep(.tiptap) {
  min-height: 300px;
  padding: 2rem;
}
</style>
```

### Custom Extensions

If you need additional Tiptap extensions, you can create a custom editor:

```vue
<script setup lang="ts">
import { Image } from '@tiptap/extension-image'

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    TiptapStarterKit,
    TiptapTextStyle,
    TiptapColor,
    Image  // Add custom extension
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})
</script>

<template>
  <div>
    <CroutonEditorToolbar :editor="editor" />
    <TiptapEditorContent :editor="editor" />
  </div>
</template>
```

## API Reference

### CroutonEditorSimple Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | HTML content (v-model) |

### CroutonEditorSimple Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when content changes |

### CroutonEditorToolbar Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `editor` | `Editor` | Yes | Tiptap editor instance |

## Included Tiptap Extensions

- **StarterKit** - Essential editing functionality
- **TextStyle** - Text styling support
- **Color** - Text color customization

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Development

```bash
# Install dependencies
pnpm install

# Link for local development
pnpm link --global

# In your project
pnpm link --global @friendlyinternet/nuxt-crouton-editor
```

## Support

For issues, questions, or contributions:
- GitHub: [https://github.com/pmcp/nuxt-crouton](https://github.com/pmcp/nuxt-crouton)
- Issues: [https://github.com/pmcp/nuxt-crouton/issues](https://github.com/pmcp/nuxt-crouton/issues)

## License

MIT

---

*Part of the Nuxt Crouton ecosystem*