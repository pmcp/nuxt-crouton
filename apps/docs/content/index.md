---
seo:
  title: Nuxt Crouton - Fast CRUD for nuxt 4
  description: Generate working CRUD applications in 30 seconds. Built for solo developers who want to ship fast, maintain clean code, and own what they build.
---

::u-page-hero{class="dark:bg-gradient-to-b from-neutral-900 to-neutral-950"}
---
orientation: horizontal
---
#top
:hero-background

#title
Ship Fast [CRUD Applications]{.text-primary}.

#description
Generate working forms, tables, and TypeScript types in 30 seconds. **Nuxt Crouton** is a code generator and composable library for building maintainable CRUD applications in **[Nuxt](https://nuxt.com)** 4. Built on the opinionated [SuperSaaS](https://supersaas.dev/) foundation. Generate → Customize → Own.

#links
  :::u-button
  ---
  to: /getting-started
  size: xl
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  icon: i-simple-icons-github
  color: neutral
  variant: outline
  size: xl
  to: https://github.com/pmcp/nuxt-crouton
  target: _blank
  ---
  View on GitHub
  :::

#default
  :::prose-pre
  ---
  code: |
    # Generate a complete CRUD collection
    npx crouton-generate shop products --fields-file product-schema.json

    # Generated files:
    # ✅ List.vue - Table/grid/card views
    # ✅ Form.vue - Create/edit/delete forms
    # ✅ useProducts.ts - Validation & config
    # ✅ types.ts - Full TypeScript support
  filename: terminal
  ---

  ```bash [terminal]
  # Generate a complete CRUD collection
  npx crouton-generate shop products --fields-file product-schema.json

  # Generated files:
  # ✅ List.vue - Table and list views
  # ✅ Form.vue - Create/edit/delete forms
  # ✅ useProducts.ts - Validation & config
  # ✅ types.ts - Full TypeScript support
  ```
  :::
::

::u-page-section{class="dark:bg-neutral-950"}
#title
Why Nuxt Crouton?

#features
  :::u-page-feature
  ---
  icon: i-lucide-zap
  ---
  #title
  80% Done in 30 Seconds

  #description
  Generate working CRUD interfaces with forms, validation, tables, and TypeScript types. Start customizing immediately, not writing boilerplate.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-code
  ---
  #title
  You Own the Code

  #description
  Generated code lives in YOUR project. No runtime magic, no vendor lock-in. Customize freely, regenerate when needed, or keep it as-is forever.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-layers
  ---
  #title
  Domain-Driven Layers

  #description
  Organize collections by domain (shop, blog, admin). Each layer is self-contained and can be reused across projects or deployed independently.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-database
  ---
  #title
  Smart Data Caching

  #description
  Built on [useFetch](https://nuxt.com/docs/api/composables/use-fetch) with automatic cache invalidation. Update data once, all views refresh automatically. No manual refetch logic.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-check-circle
  ---
  #title
  Validation Included

  #description
  [Zod](https://zod.dev) schemas generated for every collection. Add custom validation rules, async checks, and cross-field validation with full TypeScript support.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-globe
  ---
  #title
  i18n Ready

  #description
  Optional translation support with per-field localization. Auto-generates translation inputs and handles locale switching with cache refresh.
  :::
::

::u-page-section{class="dark:bg-neutral-950"}
#title
What You Get

#links
  :::u-button
  ---
  color: neutral
  size: lg
  to: /fundamentals
  trailingIcon: i-lucide-arrow-right
  variant: subtle
  ---
  Explore Fundamentals
  :::

  :::u-button
  ---
  color: neutral
  size: lg
  to: /generation
  trailingIcon: i-lucide-code
  variant: subtle
  ---
  Code Generation
  :::

  :::u-button
  ---
  color: neutral
  size: lg
  to: /patterns
  trailingIcon: i-lucide-layers
  variant: subtle
  ---
  Patterns & Best Practices
  :::

#features
  :::u-page-feature
  ---
  icon: i-lucide-table
  ---
  #title
  List Components

  #description
  Table and list layouts with sorting, pagination, and empty states. Responsive and accessible out of the box.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-edit
  ---
  #title
  Form Components

  #description
  Create, edit, and delete forms with validation. Open in modals, slideovers, or dialogs. Supports nested forms up to 5 levels deep.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-code-2
  ---
  #title
  TypeScript Types

  #description
  Full type safety for every collection. Types for schemas, API responses, form state, and composable returns.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-wrench
  ---
  #title
  Composables

  #description
  useCollectionQuery for fetching, useCollectionMutation for updates, useCrouton for modal management. All with full TypeScript support.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-bell
  ---
  #title
  Toast Notifications

  #description
  Success and error toasts on all mutations. Customizable messages with i18n support.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-users
  ---
  #title
  Team-Based Auth

  #description
  Optional team utilities for multi-tenant apps. Automatic team scoping on all queries and mutations with team switching support.
  :::
::

::u-page-section{class="dark:bg-neutral-900"}
#title
Documentation Sections

#features
  :::u-page-feature
  ---
  icon: i-lucide-rocket
  ---
  #title
  [Getting Started](/getting-started)

  #description
  Installation, quickstart guide, and your first collection in 30 seconds.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-book
  ---
  #title
  [Fundamentals](/fundamentals)

  #description
  Core concepts: collections, layers, architecture, forms, data operations, and caching.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-terminal
  ---
  #title
  [Generation](/generation)

  #description
  Code generation: schema format, CLI commands, multi-collection generation, and CLI reference.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-blocks
  ---
  #title
  [Patterns](/patterns)

  #description
  Working with data: relations, forms, tables, Drizzle integration, and list layouts.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-palette
  ---
  #title
  [Customization](/customization)

  #description
  Customize components, add custom fields, configure columns, and design layouts.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-sparkles
  ---
  #title
  [Features](/features)

  #description
  Advanced features: i18n, rich-text, assets, connectors, events, maps, and devtools.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-settings
  ---
  #title
  [Advanced](/advanced)

  #description
  Team-based auth, conditional fields, bulk operations, and optimistic updates.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-code
  ---
  #title
  [API Reference](/api-reference)

  #description
  Complete API docs: composables, components, types, server utilities, and internal API.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-life-buoy
  ---
  #title
  [Guides](/guides)

  #description
  Best practices, troubleshooting, migration guides, rollback strategies, and asset management.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-book-open
  ---
  #title
  [Reference](/reference)

  #description
  Conventions, FAQ, and glossary for quick lookup.
  :::
::

::u-page-section{class="dark:bg-gradient-to-b from-neutral-950 to-neutral-900"}
  :::u-page-c-t-a
  ---
  links:
    - label: Get Started
      to: '/getting-started'
      trailingIcon: i-lucide-arrow-right
    - label: View Examples
      to: '/guides/troubleshooting'
      variant: subtle
      icon: i-lucide-book-open
  title: Ready to ship faster?
  description: Join developers building maintainable CRUD apps with Nuxt Crouton. Generate your first collection in 30 seconds.
  class: dark:bg-neutral-950
  ---

  :stars-bg
  :::
::
