# Fundamentals Overview

This section covers the core concepts and architecture of Nuxt Crouton. Understanding these fundamentals is essential for building applications with the framework.

## What You'll Learn

The Fundamentals section provides a deep understanding of how Nuxt Crouton works under the hood:

- **Core Architecture**: How Nuxt Crouton uses domain-driven design with Nuxt Layers
- **Collections**: The building blocks of your data model
- **Forms & Modals**: How CRUD operations work out of the box
- **Data Operations**: Create, read, update, and delete patterns
- **Querying Data**: How to filter, sort, and paginate collections
- **Caching**: Performance optimization through intelligent caching
- **Generated Code**: Understanding what gets generated vs. what you customize
- **Packages**: Core dependencies and their roles

## Section Contents

### 1. Collections
**File**: `1.collections.md`

Learn about collections - the fundamental building blocks of Nuxt Crouton. Collections represent your data models and define:
- Schema structure and field types
- Database table mappings
- Generated components and composables
- CRUD operations

### 2. Architecture
**File**: `2.architecture.md`

Understand the two-layer architecture pattern that powers Nuxt Crouton:
- **Generated Layer**: Auto-generated code from your schema
- **Core Layer**: Framework code you never touch
- Domain-driven design principles
- How layers interact and extend each other

### 3. Forms & Modals
**File**: `3.forms-modals.md`

Explore the built-in form and modal system:
- Auto-generated forms from collection schemas
- Modal patterns for create/edit operations
- Form validation and error handling
- Customizing form behavior

### 4. Data Operations
**File**: `4.data-operations.md`

Master the core CRUD operations:
- Creating new records
- Reading and fetching data
- Updating existing records
- Deleting records
- Batch operations

### 5. Querying Data
**File**: `querying.md`

Learn how to query your collections effectively:
- Filtering by field values
- Sorting results
- Pagination patterns
- Search functionality
- Complex queries with Drizzle ORM

### 6. Caching
**File**: `6.caching.md`

Understand Nuxt Crouton's caching strategy:
- Client-side cache management
- Cache invalidation patterns
- Performance optimization tips
- When to use caching vs. real-time data

### 7. Packages
**File**: `7.packages.md`

Explore the core dependencies:
- Nuxt framework integration
- Nuxt UI components
- Drizzle ORM for database operations
- Additional utilities and helpers

### 8. Generated Code
**File**: `generated-code.md`

Understand what gets auto-generated:
- Generated files structure
- How to customize generated code
- When to use overrides vs. custom components
- Regeneration workflow

## Where to Go Next

After mastering the fundamentals:

- **Generation** → Learn how to generate collections from schemas
- **Patterns** → Explore common patterns for forms, tables, and relations
- **Customization** → Customize components, fields, and layouts
- **Features** → Discover advanced features like i18n, rich text, and maps

## Prerequisites

Before diving into the fundamentals, make sure you've:
- Completed the [Getting Started](/getting-started) guide
- Installed Nuxt Crouton in your project
- Understand basic Nuxt and Vue concepts

## External Resources

For general Nuxt concepts not specific to Nuxt Crouton:
- [Nuxt Documentation](https://nuxt.com/docs)
- [Nuxt Layers Guide](https://nuxt.com/docs/guide/going-further/layers)
- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Drizzle ORM](https://orm.drizzle.team/)
