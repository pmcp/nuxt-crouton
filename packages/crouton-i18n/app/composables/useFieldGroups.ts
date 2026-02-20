import type { ComputedRef, Ref } from 'vue'

// ─── Composable ───────────────────────────────────────────────────────────────

export function useFieldGroups(
  fields: ComputedRef<string[]> | Ref<string[]>,
  fieldGroups: Ref<Record<string, string> | undefined>,
  defaultOpenGroups: Ref<string[] | undefined>,
  isBlockEditorField: (field: string) => boolean,
) {
  // Ordered groups derived from fieldGroups prop
  const computedFieldGroups = computed(() => {
    if (!fieldGroups.value) return null

    const groups: { name: string; fields: string[] }[] = []
    const groupMap = new Map<string, string[]>()

    for (const field of unref(fields)) {
      const groupName = fieldGroups.value![field] || 'Other'
      if (!groupMap.has(groupName)) {
        const groupFields: string[] = []
        groupMap.set(groupName, groupFields)
        groups.push({ name: groupName, fields: groupFields })
      }
      groupMap.get(groupName)!.push(field)
    }

    return groups
  })

  // Open/closed state for each group
  const openGroupsState = ref<Record<string, boolean>>({})

  // Initialize group open state on mount and when groups change
  watchEffect(() => {
    if (!computedFieldGroups.value) return
    for (const group of computedFieldGroups.value) {
      if (!(group.name in openGroupsState.value)) {
        openGroupsState.value[group.name] = defaultOpenGroups.value
          ? defaultOpenGroups.value.includes(group.name)
          : true
      }
    }
  })

  // A group "fills height" if it contains a block editor field
  function groupHasBlockEditor(groupFields: string[]): boolean {
    return groupFields.some(f => isBlockEditorField(f))
  }

  return {
    computedFieldGroups,
    openGroupsState,
    groupHasBlockEditor,
  }
}
