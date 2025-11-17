# Documentation Audit & Update - Briefing

**Created**: 2025-01-17
**Status**: Planning
**Documentation Location**: `/Users/pmcp/Projects/crouton-docs`
**Packages Location**: `/Users/pmcp/Projects/nuxt-crouton`

---

## Mission

Systematically audit and update the Nuxt Crouton documentation to ensure:
1. **Accuracy** - All documentation matches the current codebase
2. **Completeness** - Every feature, component, and composable is documented
3. **Quality** - Documentation follows Vue/Nuxt UI patterns for excellence
4. **AI Accessibility** - Consistent structure for AI agents to parse and use

---

## Strategy

### Documentation Style
**Emulating**: Vue.js and Nuxt UI documentation patterns

**Key Patterns**:
- Progressive disclosure (simple → complex)
- TypeScript-first with full interface definitions
- Complete, runnable code examples
- Semantic callouts (`::tip`, `::note`, `::warning`)
- Aggressive cross-referencing
- "Use the X prop to..." imperative style

### Dual Improvement Approach
**Critical**: While updating docs, we also improve the codebase when issues are found.

**Workflow per feature**:
1. Read source code
2. Identify code issues (missing types, unclear APIs, inconsistencies)
3. **Improve code first** (add types, clarify APIs, standardize patterns)
4. Update documentation to match improved code
5. Add comprehensive examples
6. Cross-reference related features

---

## Scope

### Phase 1: Core Package (@friendlyinternet/nuxt-crouton v1.5.3)

**Components** (29 total):
- CroutonCollection, CroutonTable, CroutonForm
- FormReferenceSelect, FormRepeater, FormDynamicLoader
- DetailLayout (NEW in v1.5.3), ItemCardMini
- Calendar, Date, ImageUpload
- All table-related components
- Validation and UI helpers

**Composables** (19 total):
- useCollection, useCollectionQuery, useCollectionMutation
- useCollectionItem, useCollectionProxy
- useCrouton, useTableColumns, useTableData
- useExpandableSlideover, useDependentFieldResolver
- useTeamContext, useUsers
- All utility composables

**Configuration & Conventions**:
- app.config.ts structure
- CollectionConfig interface
- Convention-based features (Card.vue, Detail.vue auto-detection)
- Layout presets and ResponsiveLayout
- Hook system (`crouton:mutation`)
- Team-based routing patterns

### Phase 2: Stable Addon Packages

**@friendlyinternet/nuxt-crouton-i18n** (v1.3.0):
- Translation components (Display, Input, InputWithEditor, LanguageSwitcher, etc.)
- useEntityTranslations, useT, useTranslationsUi
- Locale configuration (EN/NL/FR)

**@friendlyinternet/nuxt-crouton-editor** (v1.3.0):
- TipTap components (Simple, Preview, Toolbar, CommandsList)
- Integration patterns

**@friendlyinternet/nuxt-crouton-collection-generator** (v1.4.3):
- CLI commands and flags
- Schema format
- Config file options
- Rollback features

### Phase 3: Beta Features (New Section)

Create dedicated "Beta Features" section:

**Packages to document**:
- nuxt-crouton-assets (v0.3.0) - Asset management
- nuxt-crouton-events (v0.3.0) - Event tracking
- nuxt-crouton-maps (v0.3.0) - Mapbox integration
- nuxt-crouton-connector (v0.3.0) - External connectors
- nuxt-crouton-devtools (v0.3.0) - DevTools integration

---

## Documentation Template (Per Component/Composable)

### File Structure
```markdown
---
title: ComponentName / composableName
description: One-sentence description
category: components | composables | types | guides
package: "@friendlyinternet/nuxt-crouton"
related:
  - /api-reference/composables/use-collection-mutation
  - /api-reference/components/crouton-form
---

# ComponentName

> One-sentence description

## Usage

Basic example - simplest possible usage

### Feature 1

One H3 per feature with focused example

### Feature 2

Progressive complexity

## Examples

Real-world, complete scenarios

### Specific Use Case

Complex patterns, integrations

## API

### Props / Parameters

Full TypeScript interface with JSDoc comments

### Slots (for components)

All available slots

### Emits (for components)

Event signatures

### Returns (for composables)

Return value structure

### When to Use

Guidance on when to use vs alternatives

## Theme (for styled components)

app.config.ts configuration
```

### Code Example Standards

**Always include**:
- Complete, runnable examples
- TypeScript with proper types
- `<script setup lang="ts">` syntax
- File name notation for multi-file: `[ExampleName.vue]`
- Imports shown explicitly

**Example**:
```vue
<script setup lang="ts">
const { items, pending } = await useCollectionQuery('products')

const columns = [
  { accessorKey: 'name', header: 'Product' },
  { accessorKey: 'price', header: 'Price' }
]
</script>

<template>
  <CroutonCollection :rows="items" :columns="columns" />
</template>
```

### Callout Usage

```markdown
::tip
Helpful additional information or shortcuts
::

::note
Important context or clarifications
::

::warning
Caution about potential issues or breaking changes
::

::callout{icon="i-heroicons-information-circle" to="/docs/related"}
General callouts with links
::
```

---

## AI Accessibility Features

### 1. Consistent Frontmatter
Every page has:
- `title` - Exact component/composable name
- `description` - One clear sentence
- `category` - Classification for filtering
- `package` - Scope
- `related` - Explicit relationships

### 2. Structured Headings (Always in Order)
- H1: Title
- H2: Usage (basic examples)
- H3: Individual features
- H2: Examples (real-world)
- H2: API (full signatures)
- H2: Theme (if applicable)

### 3. TypeScript-First
- All code examples use TypeScript
- Full interface definitions in API sections
- JSDoc comments on all properties
- No plain JavaScript examples

### 4. Complete Examples
- Every example is runnable
- No partial snippets (except in API signatures)
- Imports shown
- Types explicit

### 5. Cross-References
- Link to every related feature
- Use exact paths: `[CroutonForm](/api-reference/components#croutonform)`
- Link to guides, concepts, examples

---

## Code Improvement Checklist

When auditing each feature, look for:

### TypeScript Issues
- [ ] Props use `any` or `Array` instead of specific types
- [ ] Missing interface definitions
- [ ] No JSDoc comments on public APIs
- [ ] Return types not defined

### Naming Issues
- [ ] Inconsistent prop names across similar components
- [ ] Unclear event names
- [ ] Confusing composable returns

### Missing Features
- [ ] No loading states where expected
- [ ] No error handling
- [ ] Missing useful return values from composables
- [ ] No slots where helpful

### API Clarity
- [ ] Props without defaults documented
- [ ] Undocumented conventions
- [ ] Magic behavior not explained in code comments

### Pattern Consistency
- [ ] Different patterns for same functionality
- [ ] Inconsistent export patterns
- [ ] Mixed naming conventions

---

## Execution Workflow (Per Feature)

### Discovery Phase
1. **Read source code** - Component/composable implementation
2. **Extract API** - Props, slots, emits, types, behavior
3. **Check existing docs** - Compare what's documented vs actual code
4. **Identify gaps** - Missing features, outdated info, code issues

### Improvement Phase (if needed)
5. **Analyze issues** - Determine what needs improvement
6. **Propose changes** - TypeScript types, better naming, missing features
7. **Implement improvements** - Make code changes
8. **Test changes** - Ensure nothing breaks, run `npx nuxt typecheck`

### Documentation Phase
9. **Create/update doc page** - Follow Nuxt UI template
10. **Write Usage section** - Simplest example first
11. **Add feature sections** - One H3 per feature
12. **Add Examples** - 2+ real-world scenarios
13. **Document API** - Full TypeScript interfaces
14. **Add cross-references** - Link related features
15. **Add callouts** - Tips, notes, warnings

### Completion
16. **Quality check** - Review against checklist
17. **Mark complete** - Update progress tracker

---

## Quality Standards (Definition of Done)

### Per Feature
- [ ] Accurate API documentation matching code
- [ ] At least one basic example
- [ ] At least one advanced/real-world example
- [ ] All parameters/props have types and descriptions
- [ ] Related features cross-referenced
- [ ] Code examples are complete and runnable
- [ ] TypeScript types shown, not just JavaScript
- [ ] "When to use" guidance included

### Per Package
- [ ] Installation instructions accurate
- [ ] All exports documented
- [ ] Version number matches package.json
- [ ] Dependencies listed
- [ ] Breaking changes noted (if any)

### Overall Documentation
- [ ] No broken internal links
- [ ] Navigation structure logical
- [ ] Search-optimized (component/composable names)
- [ ] Beta features clearly separated
- [ ] Migration guides updated

---

## Tracking System

Progress tracked in `/Users/pmcp/Projects/nuxt-crouton/docs/DOCS_PROGRESS_TRACKER.md`

**Feature-level granularity**:
```markdown
## Phase 1: Core Package - Components

- [ ] CroutonCollection - Reviewed, improved, documented
- [ ] CroutonTable - Reviewed, improved, documented
- [x] ✅ CroutonForm - Complete with all examples
```

---

## Estimated Timeline

- **Phase 1 (Core)**: ~50 features → 10-15 focused sessions
- **Phase 2 (Stable Addons)**: ~20 features → 5-7 sessions
- **Phase 3 (Beta Section)**: ~15 features + pages → 5-7 sessions

**Total**: 20-30 sessions moving methodically

---

## Success Metrics

1. **Completeness**: Every exported component/composable documented
2. **Accuracy**: Zero discrepancies between code and docs
3. **AI-Friendly**: Consistent patterns, searchable, structured
4. **Developer-Friendly**: Clear examples, when/why guidance
5. **Maintainable**: Easy to update when packages change
6. **Code Quality**: Improved TypeScript coverage, clearer APIs

---

## Key Principles

### From Vue/Nuxt UI Docs
- Start simple, build to complex
- Every feature gets an example
- TypeScript signatures always shown
- Cross-reference aggressively
- Use semantic callouts
- Complete, runnable code only

### From CLAUDE.md
- Run `npx nuxt typecheck` after code changes
- Use Composition API with `<script setup>`
- Keep it simple (KISS principle)
- Document as you go
- Track progress systematically

### Our Additions
- Improve code while documenting
- Fix inconsistencies immediately
- Add missing types proactively
- Standardize patterns across packages
- Make APIs clearer for developers

---

## Next Steps

1. Review and approve this briefing
2. Begin Phase 1 with first component (CroutonCollection)
3. Establish quality baseline with first complete example
4. Iterate through remaining features systematically
5. Update progress tracker after each completion

---

**Ready to begin systematic documentation improvement!** 🚀
