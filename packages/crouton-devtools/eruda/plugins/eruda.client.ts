// Gated eruda loader. Runs on the client only and dynamic-imports eruda (its own
// chunk) so production — where the flag is false — never fetches it. Enabled when:
//   - running locally (`import.meta.dev`), or
//   - the public runtime flag is on (NUXT_PUBLIC_CROUTON_ERUDA=true, set by a
//     staging build).
export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return

  const enabled = import.meta.dev || useRuntimeConfig().public.croutonEruda
  if (!enabled) return

  const eruda = (await import('eruda')).default
  eruda.init()
})
