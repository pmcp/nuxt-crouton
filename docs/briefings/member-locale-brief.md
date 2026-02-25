# Member Locale Persistence

## Summary

Add a `member_profile` table to `crouton-auth` to store per-membership preferences (starting with `locale`), keeping Better Auth's `member` table untouched. The language switcher should persist the choice to the database, and it should be auto-applied on login/team-switch. This also enables server-side locale lookup for email sending.

## Context

Currently the language switcher (`crouton-i18n`) only calls `setLocale()` in-memory — nothing persists. When a user refreshes or switches devices, the locale resets. For the bookings system, we also need server-side locale to send emails in the right language.

Storing locale on the member level (not `user`) is intentional — a user could prefer different languages in different teams.

## Architecture Decision: `member_profile` Table

Better Auth owns the `member` table. Adding custom columns to it works but mixes auth concerns with app preferences and risks conflicts on library upgrades. Instead, we create a separate `member_profile` table with a 1:1 relation to `member`:

- **Clean separation** — Better Auth owns `member`, we own `member_profile`
- **Extensible** — future fields (timezone, notification prefs, dashboard layout) go here
- **CASCADE delete** — cleanup is automatic when a member is removed
- **Lazy-create** — profile row is created on first write (PATCH), not on member creation

## Files to Change

### 1. Database Schema — NEW FILE in `crouton-auth`

**File:** `packages/crouton-auth/server/database/schema/member-profile.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { member } from './auth'

export const memberProfile = sqliteTable('member_profile', {
  id: text('id').primaryKey().$default(() => nanoid()),
  memberId: text('memberId').notNull().unique()
    .references(() => member.id, { onDelete: 'cascade' }),
  locale: text('locale'), // null = use team/site default
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
    .notNull().$default(() => new Date()).$onUpdate(() => new Date()),
})
```

Re-export from the schema barrel file (`packages/crouton-auth/server/database/schema/index.ts`).

### 2. Relations

**File:** `packages/crouton-auth/server/database/schema/member-profile.ts`

```typescript
import { relations } from 'drizzle-orm'

export const memberProfileRelations = relations(memberProfile, ({ one }) => ({
  member: one(member, {
    fields: [memberProfile.memberId],
    references: [member.id]
  })
}))
```

Also add the inverse relation on `member` in `auth.ts`:

```typescript
// Add to existing memberRelations
profile: one(memberProfile, {
  fields: [member.id],
  references: [memberProfile.memberId]
})
```

### 3. Types — `crouton-auth`

**File:** `packages/crouton-auth/types/auth.ts`

Add:

```typescript
export type MemberProfile = typeof memberProfile.$inferSelect
export type NewMemberProfile = typeof memberProfile.$inferInsert
```

Extend existing `Member` type or create a `MemberWithProfile` type:

```typescript
export type MemberWithProfile = Member & {
  profile?: MemberProfile | null
}
```

### 4. Migration

Run `npx nuxt db generate` in any app that uses crouton-auth to generate the CREATE TABLE migration for `member_profile`.

### 5. API Endpoint — NEW FILE

**File:** `packages/crouton-auth/server/api/teams/[id]/members/[userId]/profile.patch.ts`

- Accepts partial profile fields: `{ locale?: string, timezone?: string, ... }`
- Auth check: member can update own profile, admins can update any member's
- Validates `locale` against the team's configured locales (from crouton-i18n config), not arbitrary ISO codes — setting an unsupported locale is meaningless
- Upserts `member_profile` row using true SQL upsert (`INSERT ... ON CONFLICT DO UPDATE`), not check-then-insert — concurrent requests for the same member must not race
- Generic endpoint avoids needing per-field routes (`locale.patch.ts`, `timezone.patch.ts`, etc.)

### 6. Server Utility — `crouton-auth`

**File:** `packages/crouton-auth/server/utils/member-profile.ts`

Shared helper for upserting and reading member profiles:

```typescript
export async function getMemberProfile(memberId: string) {
  // SELECT from member_profile WHERE memberId = ?
}

export async function upsertMemberProfile(memberId: string, data: Partial<NewMemberProfile>) {
  // INSERT ... ON CONFLICT(memberId) DO UPDATE
}
```

### 7. Composable — `crouton-auth`

**File:** `packages/crouton-auth/app/composables/useTeam.ts`

Add method:

```typescript
async function updateMemberProfile(data: Partial<NewMemberProfile>) {
  // PATCH /api/teams/{teamId}/members/{userId}/profile
  // Update local member profile state
}

// Convenience shorthand
async function updateMemberLocale(locale: string) {
  return updateMemberProfile({ locale })
}
```

Expose `memberProfile` (or at minimum `memberLocale`) as a computed from the current member's profile.

### 8. Language Switcher — `crouton-i18n`

**Files:**
- `packages/crouton-i18n/app/components/LanguageSwitcher.vue`
- `packages/crouton-i18n/app/components/LanguageSwitcherIsland.vue`

After `setLocale()`, also call `updateMemberLocale()` if user is authenticated. Non-authenticated users keep in-memory-only behavior.

### 9. Auto-apply on Login/Team-Switch

**File:** `packages/crouton-auth/app/composables/useTeam.ts` or `useSession.ts`

When loading current member record, fetch `member_profile` as a **separate query after member loads** (not a JOIN on Better Auth's member query). This keeps auth code untouched. If `profile.locale` is set, call `setLocale(profile.locale)` to sync the UI.

## Constraints

- Better Auth's `member` table is read-only for us — all custom fields go in `member_profile`
- Member table is in `crouton-auth`, language switcher is in `crouton-i18n` — use the composable from `crouton-auth` as the bridge
- i18n config: `strategy: 'no_prefix'`, `detectBrowserLanguage: false`
- Public pages use URL-driven locale (`/[team]/[locale]/[slug]`), admin pages would use member preference
- Use `hub: { db: 'sqlite' }` — NEVER `hub: { database: true }`
- Profile rows are lazy-created on first PATCH, not eagerly on member creation
- Profile fetch is a separate query after member loads — never JOIN on Better Auth's member query
- Upsert must be true SQL upsert (`ON CONFLICT DO UPDATE`), not check-then-insert — prevents race conditions on concurrent requests
- Locale validation is against the team's configured locales, not arbitrary ISO codes

## Future Extensions

The `member_profile` table is designed to grow. Likely future columns:
- `timezone` — for scheduling and date display
- `notificationPrefs` — JSON column for email/push preferences
- `dashboardLayout` — JSON column for UI customization

## Testing

- Switch language → refresh → should persist
- Switch team → should apply that team's member locale
- Non-authenticated user → should still work (in-memory only)
- Email sending → should use member's locale for template selection
- New member with no locale set → falls back to team/site default
- Member deletion → profile row should cascade-delete
- First locale save → should create profile row (upsert)
- Concurrent locale saves → should not fail (upsert handles race)
- Setting unsupported locale → should be rejected by validation