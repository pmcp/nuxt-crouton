// v1.0.2 - Removed debug console.log statements for production
import { promiseTimeout } from '@vueuse/core'

export default function () {
  const activeToast = useState('activeToasts', () => false)
  const toastVibration = useState('toastVibration', () => false)

  const vibrateToast = async () => {
    if (activeToast.value) toastVibration.value = true
    await promiseTimeout(500)
    toastVibration.value = false
  }

  const triggerErrorMessage = (type: string, message: string, description: string | null, _multiple: boolean) => {
    if (activeToast.value) return vibrateToast()
    activeToast.value = true
    if (type === 'error') {
      const toast = useToast()
      toast.add({
        title: message,
        description: description || undefined,
        color: 'error',
      })
    }
    toastVibration.value = false
  }

  const foundErrors = () => {
    const isOnline = useNetwork().isOnline.value

    if (!isOnline) {
      triggerErrorMessage('error', 'Check your connection status.', null, false)
      return true
    }

    const userSession = useSession()
    const loggedIn = !!userSession.user?.value

    if (!loggedIn) {
      triggerErrorMessage('error', 'You are not logged in.', null, false)
      return true
    }

    return false
  }

  return {
    foundErrors,
    activeToast,
    toastVibration
  }
}
