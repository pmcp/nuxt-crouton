/**
 * GET /api/teams/[id]/translations-ui
 * List all team-specific translation overrides
 *
 * Query params:
 * - locale: Optional locale filter
 */
export default defineEventHandler(async (event) => {
  // Get team and verify membership
  const { team } = await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)
  const locale = query.locale as string | undefined

  // Fetch team-specific translations
  const translations = await getTeamTranslations(team.id)

  // Filter by locale if provided
  if (locale) {
    return translations.filter(t =>
      t.values && typeof t.values === 'object' && t.values !== null && locale in t.values
    )
  }

  return translations
})
