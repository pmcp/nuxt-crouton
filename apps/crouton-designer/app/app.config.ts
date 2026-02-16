import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'
import { designerProjectsConfig } from '../layers/designer/collections/projects/app/composables/useDesignerProjects'
import { designerCollectionsConfig } from '../layers/designer/collections/collections/app/composables/useDesignerCollections'
import { designerFieldsConfig } from '../layers/designer/collections/fields/app/composables/useDesignerFields'

export default defineAppConfig({
  croutonCollections: {
    designerFields: designerFieldsConfig,
    designerCollections: designerCollectionsConfig,
    designerProjects: designerProjectsConfig,
    translationsUi: translationsUiConfig,
  }
})
