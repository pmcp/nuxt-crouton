<!--
  SalesLocationForm
  Package-provided form for the sales locations collection.
  Replaces the CLI-generated _Form.vue (wired via componentName in
  useSalesLocations config). Event is implied by the event workspace.
-->

<template>
  <CroutonFormActionButton
    v-if="action === 'delete'"
    :action="action"
    :collection="collection"
    :items="items"
    :loading="loading"
    @click="handleSubmit"
  />

  <UForm
    v-else
    :schema="schema"
    :state="state"
    @submit="handleSubmit"
  >
    <CroutonFormLayout>
      <template #main>
        <div class="flex flex-col gap-4 p-1">
          <UFormField v-if="!hideEvent" label="Event" name="eventId" class="not-last:pb-4">
            <CroutonFormReferenceSelect
              v-model="state.eventId"
              collection="salesEvents"
              label="Event"
            />
          </UFormField>
          <UFormField label="Title" name="title" class="not-last:pb-4">
            <UInput v-model="state.title" class="w-full" size="xl" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <CroutonFormActionButton
          :action="action"
          :collection="collection"
          :items="items"
          :loading="loading"
        />
      </template>
    </CroutonFormLayout>
  </UForm>
</template>

<script setup lang="ts">
// useSalesLocations is auto-imported from the generated collection layer at runtime.
declare function useSalesLocations(): {
  defaultValue: Record<string, any>
  schema: any
  collection: string
}

interface LocationFormProps {
  action: 'create' | 'update' | 'delete'
  items?: Array<{ id: string }>
  activeItem?: Record<string, any> | null
}

const props = defineProps<LocationFormProps>()
const { defaultValue, schema, collection } = useSalesLocations()

const { create, update, deleteItems } = useCollectionMutation(collection)
const { close, loading } = useCrouton()

// Merge activeItem for both create (preset eventId from the event workspace) and
// update (the full record being edited).
const initialValues = { ...defaultValue, ...(props.activeItem || {}) }

const state = ref<Record<string, any> & { id?: string | null }>(initialValues)

// Event is implied by the workspace — hide the selector when it's preset.
const hideEvent = computed(() => !!state.value.eventId)

const handleSubmit = async () => {
  try {
    if (props.action === 'create') {
      await create(state.value)
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, state.value)
    } else if (props.action === 'delete') {
      await deleteItems(props.items as any)
    }
    close()
  } catch (error) {
    console.error('Form submission failed:', error)
  }
}
</script>