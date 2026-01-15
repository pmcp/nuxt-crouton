# Temporary Flow Components

**Status**: Temporary Location (During Development)
**Final Destination**: `layers/discubot/collections/*/app/components/`
**Migration Timeline**: Phase 9 of Flows Redesign

## Purpose

This directory contains custom flow components that are being developed during the Flows Redesign project. These components are stored here temporarily to protect them from being overwritten when Crouton regenerates collection files during schema iteration.

## Why Temporary?

During the flows redesign (Phases 1-8), we expect 2-3 iterations on the database schemas as we refine the architecture. Each time we run `pnpm crouton generate`, it regenerates the collection directories, which would overwrite any custom components placed inside them.

By keeping components here temporarily, we can:
- Iterate on schemas freely without losing custom work
- Develop UI components in parallel with schema design
- Avoid complex git conflicts and file restoration

## Components in This Directory

Once created, this directory will contain:
- `FlowBuilder.vue` - Multi-step wizard for creating flows (Task 6.1)
- `InputManager.vue` - Add/edit/delete flow inputs (Task 6.2)
- `OutputManager.vue` - Add/edit/output outputs (Task 6.3)
- `FlowList.vue` - Table view of all flows (Task 6.4)

## Migration Plan (Phase 9)

After schema stabilizes and collections are finalized:

1. **Move FlowBuilder.vue** → `layers/discubot/collections/flows/app/components/FlowBuilder.vue`
2. **Move InputManager.vue** → `layers/discubot/collections/flow-inputs/app/components/InputManager.vue`
3. **Move OutputManager.vue** → `layers/discubot/collections/flow-outputs/app/components/OutputManager.vue`
4. **Move FlowList.vue** → `layers/discubot/collections/flows/app/components/FlowList.vue`
5. **Update all imports** in page files
6. **Test everything** still works
7. **Remove this directory**

## Related Documentation

- **Architecture**: `/docs/briefings/flows-redesign-brief.md`
- **Progress Tracker**: `/docs/FLOWS_REDESIGN_TRACKER.md`
- **Shared Components**: `../shared/` (components reused across configs and flows)

## Notes

- Components in this directory use composables from `layers/discubot/composables/`
- OAuth logic: `useFlowOAuth.ts`
- Field mapping: `useFieldMapping.ts`
- Schema fetching: `useNotionSchema.ts`
- Prompt preview: `usePromptPreview.ts`

These composables are permanent and will remain in place after migration.

---

**Last Updated**: 2025-11-20
**Phase**: Phase 1 - Pre-Migration Preparation
**Task**: 1.2 - Create Temporary Components Directory
