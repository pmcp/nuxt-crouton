<script setup lang="ts">
/**
 * FileDiffBlock — Vue NodeView for `fileDiff` TipTap nodes.
 *
 * PR 4 of the notion-slideover series. Pi appends file diffs into the per-node
 * Yjs fragment via `pi.appendFileDiff`; this component is what the TipTap
 * extension renders for each one. The block is intentionally inert — there is
 * no apply / reject affordance. If the user wants to act on a diff, Pi pairs
 * it with a separate actionButton block via the PR 2 surface.
 *
 * Parsing is deliberately trivial: split on '\n' and switch on the first
 * character of each line. No diff library is bundled. Garbage-in-garbage-out
 * — malformed diffs render as plain text without coloring.
 *
 * Collapse state persists via `updateAttributes` so it round-trips through
 * Yjs and survives reload / multi-tab sync. Not a local ref.
 *
 * TODO(polish): if `crouton-editor` exposes a Shiki highlighter via its
 * public API, pipe each line's post-prefix text through it for syntax
 * highlighting. Do NOT bundle Shiki directly — plain monospace is the
 * acceptable v1 fallback and the PR ships green without highlighting.
 *
 * Note: explicit imports because VueNodeViewRenderer mounts this component
 * via TipTap and bypasses Nuxt auto-imports.
 */
import { computed } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'

interface FileDiffAttrs {
  filePath: string
  language: string
  diff: string
  collapsed: boolean
}

const props = defineProps<{
  node: { attrs: FileDiffAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<FileDiffAttrs>) => void
  deleteNode: () => void
  getPos: () => number
  editor: unknown
}>()

const attrs = computed(() => props.node.attrs)

type LineKind = 'add' | 'remove' | 'context' | 'hunk' | 'meta'

interface DiffLine {
  kind: LineKind
  text: string
}

/** Auto-detect a language slug from the file extension, when the worker
 *  didn't pass one. Kept tiny — only the common cases the badge can display.
 *  Pi-provided language wins when set. */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'ts': return 'typescript'
    case 'tsx': return 'tsx'
    case 'js': return 'javascript'
    case 'jsx': return 'jsx'
    case 'vue': return 'vue'
    case 'py': return 'python'
    case 'rs': return 'rust'
    case 'go': return 'go'
    case 'rb': return 'ruby'
    case 'java': return 'java'
    case 'kt': return 'kotlin'
    case 'swift': return 'swift'
    case 'css': return 'css'
    case 'scss': return 'scss'
    case 'html': return 'html'
    case 'json': return 'json'
    case 'yml': case 'yaml': return 'yaml'
    case 'md': return 'markdown'
    case 'sh': case 'bash': return 'bash'
    case 'sql': return 'sql'
    default: return ext
  }
}

const languageBadge = computed(() => {
  if (attrs.value.language) return attrs.value.language
  return detectLanguage(attrs.value.filePath)
})

const lines = computed<DiffLine[]>(() => {
  const raw = attrs.value.diff ?? ''
  if (!raw) return []
  // Drop a trailing empty string from a final newline — a one-line empty
  // row would render as a blank flash at the bottom of the panel.
  const split = raw.split('\n')
  if (split.length > 0 && split[split.length - 1] === '') split.pop()
  return split.map((text): DiffLine => {
    const first = text[0] ?? ' '
    switch (first) {
      case '+':
        // Unified diff headers start with '+++' / '---' — treat those as meta.
        if (text.startsWith('+++')) return { kind: 'meta', text }
        return { kind: 'add', text }
      case '-':
        if (text.startsWith('---')) return { kind: 'meta', text }
        return { kind: 'remove', text }
      case '@':
        return { kind: 'hunk', text }
      case '\\':
        // "\ No newline at end of file"
        return { kind: 'meta', text }
      case ' ':
        return { kind: 'context', text }
      default:
        // Defensive: treat unknown prefixes as context so unrecognised lines
        // still render as plain text instead of being hidden.
        return { kind: 'context', text }
    }
  })
})

const lineCount = computed(() => lines.value.length)

const addCount = computed(() => lines.value.filter(l => l.kind === 'add').length)
const removeCount = computed(() => lines.value.filter(l => l.kind === 'remove').length)

function toggleCollapsed() {
  props.updateAttributes({ collapsed: !attrs.value.collapsed })
}

function classForKind(kind: LineKind): string {
  switch (kind) {
    case 'add':
      return 'bg-green-500/10 text-success'
    case 'remove':
      return 'bg-red-500/10 text-error'
    case 'hunk':
      return 'bg-muted/50 text-muted italic'
    case 'meta':
      return 'text-muted italic'
    case 'context':
    default:
      return 'text-default'
  }
}
</script>

<template>
  <NodeViewWrapper
    class="block-wrapper my-2"
    data-type="file-diff"
    :class="{ 'ring-1 ring-primary/40 rounded-lg': selected }"
  >
    <div class="rounded-lg border border-default bg-elevated overflow-hidden">
      <button
        type="button"
        class="flex items-center justify-between gap-3 w-full px-3 py-2 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
        @click="toggleCollapsed"
      >
        <div class="flex items-center gap-2 min-w-0">
          <UIcon
            :name="attrs.collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
            class="size-4 shrink-0 text-muted"
          />
          <UIcon name="i-lucide-file-diff" class="size-4 shrink-0 text-primary" />
          <span class="font-mono text-xs truncate text-default" :title="attrs.filePath">
            {{ attrs.filePath || '(unknown file)' }}
          </span>
        </div>
        <div class="flex items-center gap-2 shrink-0 text-xs">
          <span v-if="addCount > 0" class="text-success font-mono">+{{ addCount }}</span>
          <span v-if="removeCount > 0" class="text-error font-mono">−{{ removeCount }}</span>
          <span
            v-if="languageBadge"
            class="px-1.5 py-0.5 rounded bg-default border border-default text-muted font-mono uppercase"
          >
            {{ languageBadge }}
          </span>
        </div>
      </button>
      <div v-if="!attrs.collapsed" class="border-t border-default">
        <pre
          v-if="lineCount > 0"
          class="font-mono text-xs leading-relaxed overflow-x-auto bg-default"
        ><code><span
          v-for="(line, i) in lines"
          :key="i"
          class="block px-3 whitespace-pre"
          :class="classForKind(line.kind)"
        >{{ line.text || ' ' }}</span></code></pre>
        <div v-else class="px-3 py-4 text-xs text-muted italic">
          (empty diff)
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
