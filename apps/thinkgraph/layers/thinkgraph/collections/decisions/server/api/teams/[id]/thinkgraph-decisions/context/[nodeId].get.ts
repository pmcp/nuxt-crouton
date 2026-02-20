import { getAncestorChain } from '../../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { nodeId } = getRouterParams(event)
  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Missing node ID' })
  }

  const { team } = await resolveTeamAndCheckMembership(event)

  // Walk parentId chain upward, collecting all ancestors (root first)
  const path = await getAncestorChain(nodeId, team.id)

  if (!path.length) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  // Format as markdown decision path
  const lines: string[] = [
    '# Decision Context\n',
    'The following is the chain of decisions leading to the current node:\n'
  ]

  path.forEach((node, i) => {
    const indent = '  '.repeat(i)
    const pathLabel = node.pathType ? ` [${node.pathType}]` : ''
    const branch = node.branchName && node.branchName !== 'main' ? ` (${node.branchName})` : ''
    const star = node.starred ? ' ⭐' : ''
    lines.push(`${indent}- ${node.content}${pathLabel}${branch}${star}`)
  })

  lines.push('\n---')
  lines.push(`\nCurrent node: **${path[path.length - 1]?.content}**`)

  return {
    context: lines.join('\n'),
    path
  }
})
