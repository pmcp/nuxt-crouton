import { croutonRedirectsConfig } from './composables/useCroutonRedirects'

export default defineAppConfig({
  croutonCollections: {
    croutonRedirects: croutonRedirectsConfig
  }
})
