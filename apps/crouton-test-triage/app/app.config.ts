import { triageFlowsConfig } from '../layers/triage/collections/flows/app/composables/useTriageFlows'
import { triageInputsConfig } from '../layers/triage/collections/inputs/app/composables/useTriageInputs'
import { triageOutputsConfig } from '../layers/triage/collections/outputs/app/composables/useTriageOutputs'
import { triageDiscussionsConfig } from '../layers/triage/collections/discussions/app/composables/useTriageDiscussions'
import { triageTasksConfig } from '../layers/triage/collections/tasks/app/composables/useTriageTasks'
import { triageJobsConfig } from '../layers/triage/collections/jobs/app/composables/useTriageJobs'
import { triageUsersConfig } from '../layers/triage/collections/users/app/composables/useTriageUsers'
import { triageMessagesConfig } from '../layers/triage/collections/messages/app/composables/useTriageMessages'
import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    triageMessages: triageMessagesConfig,
    triageUsers: triageUsersConfig,
    triageOutputs: triageOutputsConfig,
    triageInputs: triageInputsConfig,
    triageJobs: triageJobsConfig,
    triageTasks: triageTasksConfig,
    triageDiscussions: triageDiscussionsConfig,
    triageFlows: triageFlowsConfig,
  }
})
