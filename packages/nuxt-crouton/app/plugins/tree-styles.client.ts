export default defineNuxtPlugin(() => {
  // Inject SortableJS tree styles
  // Note: Must use plugin because Vue <style> blocks in Nuxt layers may not be bundled
  // Note: --ui-primary is oklch() not RGB, so use it directly
  const style = document.createElement('style')
  style.id = 'crouton-tree-styles'
  style.textContent = `
    /* Ghost = placeholder showing where item will drop */
    .tree-ghost {
      opacity: 0.5;
      border-left: 6px solid var(--ui-primary);
      border-radius: 0.375rem;
      background-color: color-mix(in oklch, var(--ui-primary) 20%, transparent);
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Drag = the element being dragged (follows cursor) */
    .tree-drag {
      background-color: var(--ui-bg);
      box-shadow: var(--shadow-xl);
      border-radius: 0.375rem;
      border: 2px solid var(--ui-primary);
      transform: rotate(1deg) scale(1.02);
    }

    /* Chosen = the original element that was picked up */
    .tree-chosen {
      background-color: color-mix(in oklch, var(--ui-primary) 15%, transparent);
      outline: 2px dashed color-mix(in oklch, var(--ui-primary) 50%, transparent);
    }
  `
  document.head.appendChild(style)
  console.log('[crouton] Tree styles injected')
})
