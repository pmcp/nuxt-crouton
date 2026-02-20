// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePeopleContact } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { PeopleContact } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { contactId } = getRouterParams(event)
  if (!contactId) {
    throw createError({ status: 400, statusText: 'Missing contact ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PeopleContact>>(event)

  return await updatePeopleContact(contactId, team.id, user.id, {
    name: body.name,
    email: body.email,
    phone: body.phone,
    website: body.website,
    bio: body.bio,
    avatar: body.avatar,
    resume: body.resume,
    active: body.active,
    birthday: body.birthday ? new Date(body.birthday) : body.birthday,
    socialLinks: body.socialLinks,
    skills: body.skills
  })
})