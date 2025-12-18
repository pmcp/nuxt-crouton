# Performance Guide

This document covers performance optimizations implemented in @crouton/auth and best practices for maintaining optimal performance.

## Bundle Size Optimization

### Tree-Shaking

@crouton/auth is designed for optimal tree-shaking:

- Composables are auto-imported only when used
- Components are registered per-directory for granular imports
- Server utilities are imported only in server context

### Component Loading Strategy

Components are organized by loading priority:

**Eager Loading (always included):**
- `Auth/*` - Login/Register forms needed at app start
- `Sidebar/*` - Always visible navigation
- `Loading/*` - Skeletons and guards
- `Error/*` - Error display

**Lazy Loading Recommended:**
- `Account/*` - Settings pages (load on navigation)
- `Team/*` - Team management (load on navigation)
- `Billing/*` - Billing pages (load on navigation)

### Using Lazy Components

```vue
<template>
  <!-- Nuxt auto-prefixes lazy-loaded components -->
  <LazyAccountSettings v-if="showSettings" />
  <LazyTeamMembers v-if="showMembers" />
  <LazyBillingPricingTable v-if="showPricing" />
</template>
```

## Caching Strategy

### Client-Side Caching

Use `useAuthCache` for caching API responses:

```typescript
const { getCached, setCached, withCache, CACHE_TTL } = useAuthCache()

// Manual caching
const cachedTeams = getCached('teams')
if (!cachedTeams) {
  const teams = await fetchTeams()
  setCached('teams', teams, { ttl: CACHE_TTL.TEAMS })
}

// Automatic caching wrapper
const fetchTeamsCached = withCache(
  'teams',
  () => $fetch('/api/teams'),
  { ttl: CACHE_TTL.TEAMS }
)
```

### Cache TTL Guidelines

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Session | 30s | Can change (logout, etc.) |
| Team List | 60s | Rarely changes |
| Team Members | 60s | Rarely changes |
| Billing Info | 5m | Rarely changes |
| User Profile | 60s | User may edit |
| Invitations | 30s | Can be accepted/revoked |

### Cache Invalidation

Invalidate caches on mutations:

```typescript
const { invalidate, invalidateByPrefix } = useAuthCache()

// After team creation
invalidate(cacheKeys.teams(userId))

// After logout
invalidateByPrefix('auth:')
```

## Server-Side Optimizations

### Database Query Optimization

**Always use indexes:**
```typescript
// ✅ Uses session_token_idx
db.query.session.findFirst({
  where: eq(session.token, tokenHash)
})

// ✅ Uses org_member_idx
db.query.member.findMany({
  where: and(
    eq(member.organizationId, teamId),
    eq(member.userId, userId)
  )
})
```

**Avoid N+1 queries:**
```typescript
// ❌ Bad: N+1 query
const teams = await db.query.organization.findMany()
for (const team of teams) {
  const members = await db.query.member.findMany({
    where: eq(member.organizationId, team.id)
  })
}

// ✅ Good: Single query with join
const teams = await db.query.organization.findMany({
  with: {
    members: true
  }
})
```

### Session Optimization

Better Auth optimizes session handling:

- Sessions are cached in memory for the request
- Session validation is deferred until needed
- Expired sessions are cleaned up lazily

### API Response Optimization

Return only needed fields:

```typescript
// ✅ Select specific fields
const users = await db.select({
  id: user.id,
  name: user.name,
  email: user.email,
}).from(user)

// ❌ Avoid selecting all fields
const users = await db.select().from(user)
```

## Loading State Optimization

### Prevent Layout Shift

Use skeletons matching content dimensions:

```vue
<template>
  <AuthGuard>
    <template #loading>
      <AuthSkeleton type="profile" />
    </template>
    <AccountSettings />
  </AuthGuard>
</template>
```

### Debounce Rapid Changes

```typescript
const loading = ref(false)
const debouncedLoading = computed(() => {
  // Don't flash loading for fast operations
  return loading.value && hasBeenLoadingFor(100)
})
```

### Progressive Loading

Load critical content first:

```vue
<template>
  <!-- Critical: user info -->
  <UserHeader :user="user" />

  <!-- Deferred: team list -->
  <Suspense>
    <TeamList />
    <template #fallback>
      <AuthSkeleton type="list" />
    </template>
  </Suspense>
</template>
```

## Best Practices

### 1. Minimize Re-renders

Use `v-once` for static content:

```vue
<template>
  <div v-once class="auth-header">
    <h1>Welcome to {{ appName }}</h1>
  </div>
</template>
```

### 2. Lazy Load Heavy Dependencies

```typescript
// Lazy load QR code library for 2FA
const generateQR = async (secret: string) => {
  const QRCode = await import('qrcode')
  return QRCode.toDataURL(secret)
}
```

### 3. Preconnect to OAuth Providers

```html
<!-- In nuxt.config.ts head -->
<link rel="preconnect" href="https://accounts.google.com">
<link rel="preconnect" href="https://github.com">
```

### 4. Use HTTP/2 Push

NuxtHub automatically handles this for deployed apps.

## Monitoring

### Bundle Analysis

```bash
# Analyze bundle size
npx nuxt analyze
```

### Runtime Performance

```typescript
// In development, log slow operations
if (process.dev) {
  console.time('team-fetch')
  const teams = await fetchTeams()
  console.timeEnd('team-fetch')
}
```

### Database Query Logging

```typescript
// Enable query logging in development
export default defineNuxtConfig({
  runtimeConfig: {
    db: {
      logging: process.env.NODE_ENV === 'development'
    }
  }
})
```

## Performance Checklist

### Initial Load

- [ ] Login form loads in < 100ms
- [ ] Session check doesn't block rendering
- [ ] No flash of unauthenticated content
- [ ] Skeleton loaders in place

### Navigation

- [ ] Team switch is instant (optimistic)
- [ ] Settings pages lazy load
- [ ] No visible jank on route change

### API Calls

- [ ] Responses cached appropriately
- [ ] No duplicate requests
- [ ] Loading states shown
- [ ] Errors handled gracefully

### Bundle

- [ ] Tree-shaking working (check build output)
- [ ] No duplicate dependencies
- [ ] Heavy deps lazy loaded
