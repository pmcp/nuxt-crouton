/**
 * SPIKE (#945 / #948) — auto-wiring the analytics package would inject for every POC.
 *
 * Fires `poc_first_visit` once per browser and a `pageview` on every route change, so the
 * "is it used?" baseline exists with zero per-app code. In the real package this is what the
 * generator wires in automatically (#948); here it's hand-placed to prove the behaviour.
 */
export default defineNuxtPlugin(() => {
  const { track, pageview } = useCroutonAnalytics()
  const router = useRouter()

  // First-visit (once per browser) — the top of the lean-loop funnel.
  const FIRST_VISIT_KEY = 'crouton:poc_first_visit'
  if (!localStorage.getItem(FIRST_VISIT_KEY)) {
    localStorage.setItem(FIRST_VISIT_KEY, '1')
    track('poc_first_visit')
  }

  // Auto pageview on each navigation (and the initial load).
  pageview(router.currentRoute.value.fullPath)
  router.afterEach((to) => pageview(to.fullPath))
})
