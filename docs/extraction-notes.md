# Nuxt Crouton - Extracted Documentation Content

**Created**: 2025-01-17
**Purpose**: Preserve valuable content from deleted historical documentation files
**Status**: Reference material for integration into new documentation (Phases 1-3)

---

## Overview

This document consolidates extracted content from historical documentation files that were deleted during the Phase 0 Documentation Cleanup (Subphases 0.1 and 0.2). The content here should be integrated into the new documentation structure being created during the comprehensive documentation audit.

**Source Files Processed**:
- `docs/guides/dependent-fields-guide.md` (Subphase 0.1)
- `packages/nuxt-crouton/docs/list-layouts.md` (Subphase 0.1)
- `packages/nuxt-crouton-collection-generator/AUTHORIZATION_FIX.md` (Subphase 0.2)
- `packages/nuxt-crouton-collection-generator/CONNECTOR_INTEGRATION.md` (Subphase 0.2)
- `packages/nuxt-crouton-collection-generator/DATE_HANDLING_FIX.md` (Subphase 0.2)

---

## Table of Contents

1. [Dependent Fields Guide Content](#1-dependent-fields-guide-content)
2. [List Layouts Documentation Content](#2-list-layouts-documentation-content)
3. [Package Technical Documentation](#3-package-technical-documentation)
   - [Authorization Fix](#31-authorization-fix)
   - [Connector Integration](#32-connector-integration)
   - [Date Handling Fix](#33-date-handling-fix)

---

## 1. Dependent Fields Guide Content

**Source**: `docs/guides/dependent-fields-guide.md` (304 lines, deleted in Subphase 0.3)

### Key Concepts Extracted

#### Type Requirements
- **Pattern**: `string[] | null`
- Dependent fields must accept both arrays of strings and null values
- This ensures proper handling of optional relationships
- Type safety is critical for form validation

#### Component Naming Conventions
- **Singular vs Plural**: Critical distinction in component naming
- Use singular form for single-selection fields
- Use plural form for multi-selection fields
- Example: `FormUserSelect` (single) vs `FormUsersSelect` (multiple)

#### Automatic Singularization Logic
- The form system includes automatic singularization for component detection
- Collection names are automatically converted to singular form
- This allows `FormReferenceSelect` to find the correct component
- Example: `teams` collection → looks for `FormTeamSelect` component

#### Schema Definitions with Examples
- Dependent field schemas require specific structure
- Must include relationship type (hasOne, hasMany, belongsTo)
- Must specify target collection
- Field definitions should include proper TypeScript types

**Example Pattern**:
```typescript
{
  name: 'userId',
  type: 'string',
  relationship: 'belongsTo',
  collection: 'users',
  required: true
}
```

#### Common Mistakes Section
Key mistakes to avoid when implementing dependent fields:
- Forgetting the `| null` union type
- Incorrect component naming (plural when should be singular)
- Missing relationship configuration in schema
- Not handling the loading state properly
- Failing to refresh dependent data when parent changes

#### Troubleshooting Tips
- **Component not found**: Check naming convention (singular/plural)
- **Validation errors**: Verify `string[] | null` type
- **Data not loading**: Ensure relationship is properly configured
- **Stale data**: Check cache invalidation on mutations
- **Type errors**: Confirm schema matches TypeScript interface

---

## 2. List Layouts Documentation Content

**Source**: `packages/nuxt-crouton/docs/list-layouts.md` (301 lines, deleted in Subphase 0.3)

### Key Concepts Extracted

#### Layout Types
Four primary layout types supported:
1. **Table**: Traditional data table with columns and rows
2. **List**: Vertical list with flexible item rendering
3. **Grid**: CSS Grid-based responsive layout
4. **Cards**: Card-based display for rich content

Each layout type has specific use cases and configuration options.

#### Responsive Layout Patterns
- Layouts can adapt to different screen sizes
- Mobile-first approach recommended
- Breakpoint-based layout switching supported
- Consider touch targets on mobile devices

**Best Practices**:
- Table → List on mobile
- Grid → Cards on mobile
- Maintain consistent interaction patterns
- Test on actual devices

#### Layout Presets
Pre-configured layout combinations for common scenarios:

**Responsive Preset**:
- Desktop: Table or Grid
- Tablet: List or Cards
- Mobile: List or Cards

**Mobile-Friendly Preset**:
- All breakpoints: List or Cards
- Optimized for touch interactions
- Larger tap targets

**Compact Preset**:
- Maximize data density
- Smaller spacing
- Best for desktop/large screens

#### Automatic Field Mapping Priorities
The system automatically maps fields to display columns with intelligent prioritization:

**Priority Order**:
1. Explicitly configured fields first
2. Fields marked as `primary` or `featured`
3. Required fields
4. Non-null fields
5. Remaining fields in schema order

This ensures the most important data is always visible.

#### Custom List Item Actions
Actions can be attached to list items with flexible configuration:

**Action Types**:
- Primary action (click entire item)
- Secondary actions (button menu)
- Quick actions (icon buttons)
- Context menu (right-click)

**Configuration Options**:
- Action visibility rules
- Permission-based actions
- Conditional action display
- Custom action handlers

#### TypeScript Types
Key interfaces for layout configuration:

```typescript
type LayoutType = 'table' | 'list' | 'grid' | 'cards'

interface ResponsiveLayout {
  mobile?: LayoutType
  tablet?: LayoutType
  desktop?: LayoutType
}

interface LayoutConfig {
  default: LayoutType
  responsive?: ResponsiveLayout
  preset?: 'responsive' | 'mobile-friendly' | 'compact'
}
```

#### Performance Considerations
Important performance guidelines:

**Virtualization**:
- Use virtual scrolling for lists > 100 items
- Reduces DOM node count
- Improves scroll performance

**Lazy Loading**:
- Load additional data on scroll
- Pagination for very large datasets
- Consider infinite scroll UX

**Image Optimization**:
- Use responsive images
- Implement lazy image loading
- Consider placeholder strategies

**Memoization**:
- Memoize expensive computations
- Cache formatted values
- Use Vue's computed properties effectively

---

## 3. Package Technical Documentation

### 3.1 Authorization Fix

**Source**: `packages/nuxt-crouton-collection-generator/AUTHORIZATION_FIX.md` (118 lines)

#### Content to Integrate into CLI Documentation

**Context**: Fixed authorization middleware generation for collection API routes

**Key Points for Documentation**:

1. **Authorization Middleware Pattern**
   - Generated API routes should include team-based authorization
   - Middleware ensures users can only access their team's data
   - Pattern: `defineEventHandler(requireTeamAuth(async (event, team) => { ... }))`

2. **Common Issues**
   - Missing authorization checks in generated routes
   - Incorrect team context usage
   - Security vulnerabilities from missing auth

3. **Generator Best Practices**
   - Always include authorization in template
   - Use consistent middleware pattern across all routes
   - Document security implications clearly

4. **Example Implementation**
   - Show correct authorized route generation
   - Include team context in queries
   - Demonstrate proper error handling

**Integration Target**: Subphase 2.3 (Collection Generator CLI Documentation)

---

### 3.2 Connector Integration

**Source**: `packages/nuxt-crouton-collection-generator/CONNECTOR_INTEGRATION.md` (346 lines)

#### Content to Integrate into CLI Documentation

**Context**: Integration patterns for external system connectors in collection generator

**Key Points for Documentation**:

1. **Connector Architecture**
   - Two modes: Proxy mode and Copy-paste mode
   - Proxy: Direct API forwarding to external system
   - Copy-paste: Code generation for customization

2. **Configuration Options**
   - Connector type selection
   - External system credentials
   - Mapping configuration
   - Sync strategy options

3. **Generated Files for Connectors**
   - API proxy routes (proxy mode)
   - Composables for external API calls
   - Type definitions for external entities
   - Sync job handlers (if applicable)

4. **SuperSaaS-Specific Integration**
   - User synchronization patterns
   - Team member management
   - Webhook handling
   - Data transformation examples

5. **Custom Connector Development**
   - Template structure for new connectors
   - Required interface implementation
   - Testing patterns
   - Documentation requirements

6. **Security Considerations**
   - API key management
   - Credential storage best practices
   - Rate limiting
   - Error handling for external API failures

7. **Code Generation Patterns**
   ```typescript
   // Example: Generated proxy composable
   export const useExternalUsers = () => {
     return useFetch('/api/external/users', {
       headers: {
         'Authorization': `Bearer ${config.apiKey}`
       }
     })
   }
   ```

**Integration Target**: Subphase 2.3 (Collection Generator CLI Documentation)

---

### 3.3 Date Handling Fix

**Source**: `packages/nuxt-crouton-collection-generator/DATE_HANDLING_FIX.md` (158 lines)

#### Content to Integrate into CLI Documentation

**Context**: Proper date/time field handling in generated collections

**Key Points for Documentation**:

1. **Date Field Types**
   - Date only (YYYY-MM-DD)
   - DateTime with timezone
   - Time only
   - Timestamp (Unix epoch)

2. **Schema Configuration**
   ```typescript
   {
     name: 'createdAt',
     type: 'datetime',
     defaultValue: 'now()',
     timezone: 'UTC'
   }
   ```

3. **Generated Code Patterns**
   - Automatic UTC conversion for storage
   - Local timezone display in UI
   - Date parsing utilities
   - Validation helpers

4. **Common Issues Fixed**
   - Timezone inconsistencies
   - Date format mismatches
   - Browser timezone handling
   - Database timezone storage

5. **Component Integration**
   - Calendar component setup
   - Date input formatting
   - Display formatting utilities
   - Locale-aware date display

6. **Database Considerations**
   - Always store in UTC
   - Use ISO 8601 format for portability
   - Include timezone information
   - Handle null dates properly

7. **Testing Date Logic**
   - Mock Date.now() in tests
   - Test timezone conversions
   - Validate date parsing
   - Edge cases (leap years, DST changes)

**Integration Target**: Subphase 2.3 (Collection Generator CLI Documentation)

---

## Integration Checklist

Use this checklist when integrating extracted content into new documentation:

### Phase 1 Integration
- [ ] **Subphase 1.2** (Form Components): Integrate dependent fields content
- [ ] **Subphase 1.10** (Form Utility Composables): Add `useDependentFieldResolver` details
- [ ] **Subphase 1.1** (Display Components): Integrate list layouts content
- [ ] **Subphase 1.13** (Configuration & Types): Add layout type definitions

### Phase 2 Integration
- [ ] **Subphase 2.3** (Collection Generator):
  - Add authorization middleware documentation
  - Add connector integration patterns
  - Add date handling best practices
  - Include schema configuration examples
  - Document security considerations

### Phase 3 Integration
- [ ] **Subphase 3.5** (Connector Package): Reference connector integration content
- [ ] Cross-reference with collection generator docs

---

## Notes for Documentation Writers

1. **Do Not Copy Verbatim**: Extract the concepts but write fresh documentation that fits the new structure
2. **Update Examples**: Ensure code examples match current package versions
3. **Verify Accuracy**: Some extracted content may be outdated - verify against current codebase
4. **Cross-Reference**: Link related concepts across different documentation pages
5. **User Journey**: Consider how users will discover this information in the new docs

---

## Related Documentation

- **Audit Briefing**: `docs/briefings/docs-audit-brief.md`
- **Progress Tracker**: `docs/DOCS_PROGRESS_TRACKER.md`
- **Current Documentation**: `/Users/pmcp/Projects/crouton-docs/content`

---

**Last Updated**: 2025-01-17
**Status**: Ready for Phase 1-3 integration
**Maintained By**: Documentation audit process
