import { eq } from 'drizzle-orm'

export async function findFlowInputByEmailAddress(emailAddress: string) {
  const db = useDB()
  const { triageFlowInputs } = await import('~~/layers/triage/collections/flowinputs/server/database/schema')
  const { triageFlows } = await import('~~/layers/triage/collections/flows/server/database/schema')

  const [result] = await db
    .select()
    .from(triageFlowInputs)
    .leftJoin(triageFlows, eq(triageFlowInputs.flowId, triageFlows.id))
    .where(eq(triageFlowInputs.emailAddress, emailAddress))
    .limit(1)

  if (!result) return null
  return { ...result.triage_flowinputs, flowIdData: result.triage_flows }
}
