import { projectManagementProjectsConfig } from '../layers/project-management/collections/projects/app/composables/useProjectManagementProjects'
import { projectManagementTasksConfig } from '../layers/project-management/collections/tasks/app/composables/useProjectManagementTasks'
import { knowledgeBaseNotesConfig } from '../layers/knowledge-base/collections/notes/app/composables/useKnowledgeBaseNotes'

export default defineAppConfig({
  croutonCollections: {
    knowledgeBaseNotes: knowledgeBaseNotesConfig,
    projectManagementTasks: projectManagementTasksConfig,
    projectManagementProjects: projectManagementProjectsConfig,
  }
})
