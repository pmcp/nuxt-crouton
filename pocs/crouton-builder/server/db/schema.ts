// Database schema exports — the entry NuxtHub builds the runtime schema from
// (`~~/server/db/schema`). Aggregates the auth schema (crouton-auth) + UI translations
// (crouton-i18n) so `user`/team/translations tables resolve at runtime. Without this the
// app boots with no schema and every DB query (auth, team context, i18n) 500s.
//
// This app has no generated collections (the v52 board holds its document in useState),
// so there are no collection tables to aggregate here.

// Auth schema from crouton-auth (user, teams, teamSettings, userProfile, sessions, …)
export * from '@fyit/crouton-auth/server/database/schema/auth'
export * from './translations-ui'
