import { triageFlowsConfig } from '../layers/triage/collections/flows/app/composables/useTriageFlows'
import { triageFlowInputsConfig } from '../layers/triage/collections/flowinputs/app/composables/useTriageFlowInputs'
import { triageFlowOutputsConfig } from '../layers/triage/collections/flowoutputs/app/composables/useTriageFlowOutputs'
import { triageDiscussionsConfig } from '../layers/triage/collections/discussions/app/composables/useTriageDiscussions'
import { triageTasksConfig } from '../layers/triage/collections/tasks/app/composables/useTriageTasks'
import { triageJobsConfig } from '../layers/triage/collections/jobs/app/composables/useTriageJobs'
import { triageUserMappingsConfig } from '../layers/triage/collections/usermappings/app/composables/useTriageUserMappings'
import { triageInboxMessagesConfig } from '../layers/triage/collections/inboxmessages/app/composables/useTriageInboxMessages'

export default defineAppConfig({
  croutonCollections: {
    triageInboxMessages: triageInboxMessagesConfig,
    triageUserMappings: triageUserMappingsConfig,
    triageJobs: triageJobsConfig,
    triageTasks: triageTasksConfig,
    triageDiscussions: triageDiscussionsConfig,
    triageFlowOutputs: triageFlowOutputsConfig,
    triageFlowInputs: triageFlowInputsConfig,
    triageFlows: triageFlowsConfig,
  }
})
