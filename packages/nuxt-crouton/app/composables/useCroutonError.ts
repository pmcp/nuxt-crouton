
import { promiseTimeout } from '@vueuse/core'

// https://github.com/xiaoluoboding/vue-sonner
export default function () {
  const toast = useToast()
  const activeToast = useState('activeToasts', () => false);
  const toastVibration = useState('toastVibration', () => false)
  const vibrateToast = async () => {
    console.log('gonna vibrate toast')
    if(activeToast.value) toastVibration.value = true
    await promiseTimeout(500)
    toastVibration.value = false

  }
  const triggerErrorMessage = (type: string, message: string, description: string | null, multiple: boolean) => {
    console.log('ACTIVE TOASTS?',activeToast.value)
    if(activeToast.value) return vibrateToast()
    activeToast.value = true
    if(type === 'error') {
      toast.add({
        title: message,
        description: description || undefined,
        color: 'error',
      })
    }
    toastVibration.value = false

  }

  const foundErrors = () => {
    console.log('[CroutonError] Checking for errors...')

    const isOnline = useNetwork().isOnline.value
    console.log('[CroutonError] Network status:', isOnline)

    if(!isOnline) {
      console.log('[CroutonError] ERROR: Not online, blocking action')
      triggerErrorMessage('error', 'Check your connection status.', null, false)
      return true
    }

    const userSession = useUserSession()
    console.log('[CroutonError] UserSession object:', userSession)

    const loggedIn = userSession.loggedIn?.value
    console.log('[CroutonError] Login status:', loggedIn)

    if(!loggedIn) {
      console.log('[CroutonError] ERROR: Not logged in, blocking action')
      triggerErrorMessage('error', 'You are not logged in.', null, false)
      return true
    }

    console.log('[CroutonError] No errors found, proceeding')
    return false
  }

  return {
    foundErrors,
    activeToast,
    toastVibration
  }

}
