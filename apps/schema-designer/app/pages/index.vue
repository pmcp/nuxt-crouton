<script setup lang="ts">
const { state, isValid, validationErrors, reset } = useSchemaDesigner()

const showExport = ref(false)
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-[var(--ui-border)] px-4 py-3 flex items-center justify-between bg-[var(--ui-bg)]">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-database" class="text-xl text-[var(--ui-primary)]" />
        <h1 class="text-lg font-semibold">Schema Designer</h1>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-trash-2"
          @click="reset"
        >
          Reset
        </UButton>
        <UButton
          icon="i-lucide-download"
          :disabled="!isValid"
          @click="showExport = true"
        >
          Export Schema
        </UButton>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Field Catalog -->
      <aside class="w-64 border-r border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-y-auto">
        <FieldCatalog />
      </aside>

      <!-- Center: Schema Builder -->
      <main class="flex-1 overflow-y-auto bg-[var(--ui-bg)]">
        <SchemaBuilder />
      </main>

      <!-- Right: Preview Panel -->
      <aside class="w-96 border-l border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden flex flex-col">
        <PreviewPanel />
      </aside>
    </div>

    <!-- Validation Errors -->
    <div
      v-if="validationErrors.length > 0"
      class="border-t border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2"
    >
      <div class="flex items-center gap-2 text-sm text-[var(--ui-text-muted)]">
        <UIcon name="i-lucide-alert-circle" class="text-amber-500" />
        <span>{{ validationErrors[0] }}</span>
        <span v-if="validationErrors.length > 1" class="text-xs">
          (+{{ validationErrors.length - 1 }} more)
        </span>
      </div>
    </div>

    <!-- Export Modal -->
    <ExportPanel v-model="showExport" />
  </div>
</template>
