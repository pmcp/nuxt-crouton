// DEPRECATED (#810): eruda is now the **Console** tool in the unified dev-tools
// menu (`@fyit/crouton-devtools` → glasses launcher), so apps no longer need to
// `extends: ['@fyit/crouton-devtools/eruda']`. This opt-in layer stays for
// backward compatibility; prefer the menu's Console toggle for new apps.
//
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
