# Block Editor Debugging Briefing

## Problem Summary

The block editor in `packages/nuxt-crouton-pages` stopped working. When opening the page form, the editor would throw a TipTap/ProseMirror error:

```
Uncaught (in promise) RangeError: Adding different instances of a keyed plugin (plugin$)
```

## What Was Tried

### 1. Extension Singleton Pattern (Failed)
- Moved `PageBlocks` extensions to module level to prevent recreation
- **Result**: Error persisted

### 2. Disabled Component Warmup Plugin (Failed)
- Suspected `packages/nuxt-crouton/app/plugins/component-warmup.client.ts`
- **Result**: Error persisted

### 3. Isolated Issue to CroutonEditorBlocks (Successful)
- Using `UEditor` directly in Form.vue worked
- Using `CroutonEditorBlocks` wrapper caused the error
- This narrowed the problem to `Blocks.vue`

### 4. Simplified Blocks.vue (Partially Successful)
- Removed v-slot pattern, toolbar, suggestion menu
- Fixed computed content getter to return correct empty value for content type
- **Result**: Editor now works with HTML content type

## Current State

### Files Modified
- `packages/nuxt-crouton-editor/app/components/Blocks.vue` - Simplified, removed v-slot pattern
- `packages/nuxt-crouton-pages/app/components/Form.vue` - Using HTML content type

### What Works
- Editor with **HTML content type** works
- Toolbar renders (using `editorInstance` ref instead of v-slot)
- User can type and edit content

### What Does NOT Work
- **JSON content type** breaks the editor (empty content area)
- The root cause of why JSON mode fails is unknown

## Key Findings

1. **v-slot Pattern Breaks Things**: Using `v-slot="{ editor }"` on UEditor caused issues. Moving toolbar outside UEditor and using captured `editorInstance` ref works.

2. **Content Type Matters**: HTML content type works. JSON content type causes editor to not mount (empty content div).

3. **Computed Getter Issue**: The computed content getter must return appropriate empty value based on content type:
   - HTML/Markdown: return `''`
   - JSON: return `{ type: 'doc', content: [] }`

## Current Code State

### Blocks.vue Template (Working)
```vue
<template>
  <div class="crouton-editor-blocks h-full flex flex-col">
    <!-- Toolbar using captured editor instance (NOT v-slot) -->
    <UEditorToolbar
      v-if="editorInstance && showToolbar"
      :editor="editorInstance"
      :items="toolbarItems"
      class="border-b border-default px-2 py-1.5 flex-shrink-0"
    />

    <!-- Editor -->
    <UEditor
      v-model="content"
      :content-type="contentType"
      :placeholder="placeholder"
      :editable="editable"
      :autofocus="autofocus"
      :extensions="extensions"
      class="flex-1"
      :ui="{
        root: 'h-full',
        content: 'h-full p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none overflow-auto'
      }"
      @create="handleEditorCreate"
      @update="handleEditorUpdate"
    />
  </div>
</template>
```

### Form.vue Usage (Working with HTML)
```vue
<CroutonEditorBlocks
  v-model="state.content"
  placeholder="Type to start writing..."
  content-type="html"
  :editable="true"
  class="h-full"
/>
```

## Remaining Issues

1. **JSON Content Type**: Need to investigate why `content-type="json"` breaks the editor. This is important because block editors typically use JSON to store structured content.

2. **Slash Commands**: The suggestion menu for inserting blocks (`/` commands) was disabled during debugging. Needs to be re-enabled.

3. **Block Extensions**: The TipTap extensions for page blocks (Hero, Section, CTA, etc.) were disabled. Need to re-enable after fixing JSON mode.

4. **Preview Component**: `WithPreview.vue` was mentioned as a potential culprit but not fully investigated.

## Files to Investigate

- `packages/nuxt-crouton-editor/app/components/Blocks.vue` - Main wrapper component
- `packages/nuxt-crouton-pages/app/components/Editor/BlockEditor.vue` - Page-specific block editor
- `packages/nuxt-crouton-pages/app/editor/extensions/page-blocks.ts` - TipTap extensions bundle
- Nuxt UI's UEditor source code to understand JSON mode initialization

## Recommendations

1. Create a minimal reproduction of the JSON content type issue
2. Check if `{ type: 'doc', content: [] }` is the correct empty value for TipTap JSON mode
3. Look at Nuxt UI's UEditor source to understand how it handles different content types
4. Consider if the issue is with how v-model binding works with JSON objects vs strings
5. Check the TipTap documentation for proper JSON content initialization

## Context

- This editor used to work before - regression likely caused by some code change
- User mentioned researching Nuxt Studio patterns as potential inspiration
- The `component-warmup.client.ts` plugin was added recently for HMR improvements