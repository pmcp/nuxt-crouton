import { z } from 'zod'
// Import from nuxt-crouton using named export path
import { defineExternalCollection } from '@friendlyinternet/nuxt-crouton/app/composables/useExternalCollection'

/**
 * SuperSaaS Users Connector
 *
 * Connects SuperSaaS's team-based user management to Crouton's reference system.
 * Users are managed by SuperSaaS auth flows, not Crouton CRUD.
 *
 * ## Requirements
 *
 * Your SuperSaaS project must have:
 * - `getActiveTeamMembers(teamId)` function in server/database/queries/teams
 * - `validateTeamOwnership(event, teamId)` function in server/utils
 * - Team-based API routes: /api/teams/[id]/*
 *
 * ## Setup
 *
 * Just add the connector layer to your nuxt.config.ts extends array.
 * The server route and composable are auto-imported from the layer.
 *
 * ## Customization
 *
 * Add fields to the schema by creating your own version in your project.
 */

// Minimal schema - matches SuperSaaS team member structure
const userSchema = z.object({
  id: z.string(),
  title: z.string(), // Required: Used for display in CroutonReferenceSelect
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.string().optional()
})

export const usersConfig = defineExternalCollection({
  name: 'users',
  apiPath: 'members',
  fetchStrategy: 'restful',
  readonly: true, // Users are managed by SuperSaaS, not editable through Crouton
  schema: userSchema,
  meta: {
    label: 'Users',
    description: 'Team members from SuperSaaS auth system'
  }
})

export const useUsers = () => usersConfig
