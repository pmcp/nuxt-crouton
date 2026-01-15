/**
 * Composable for handling OAuth flows in popup windows
 *
 * Manages OAuth authorization flow with popup window for Slack/other integrations.
 * Preserves form state during OAuth by using popup instead of full-page redirect.
 *
 * @example
 * ```ts
 * const { openOAuthPopup, waitingForOAuth } = useFlowOAuth({
 *   teamId: currentTeam.value.id,
 *   onSuccess: (credentials) => {
 *     // Merge credentials into form
 *     state.value.apiToken = credentials.apiToken
 *     state.value.sourceMetadata = credentials.sourceMetadata
 *   }
 * })
 *
 * // In template
 * <UButton @click="openOAuthPopup">Connect with Slack</UButton>
 * ```
 */

import type { Ref } from 'vue'

export interface OAuthCredentials {
  apiToken: string
  sourceMetadata: Record<string, any>
}

export interface OAuthConfig {
  /**
   * Team ID for OAuth flow
   */
  teamId: string

  /**
   * Flow ID to add the input to (optional - if not provided, will use first flow or create new)
   * Can be a ref for reactive updates
   */
  flowId?: string | Ref<string | undefined>

  /**
   * Callback when OAuth succeeds
   */
  onSuccess?: (credentials: OAuthCredentials) => void

  /**
   * Callback when OAuth fails
   */
  onError?: (error: Error) => void

  /**
   * OAuth provider (slack, figma, etc.)
   * @default 'slack'
   */
  provider?: string
}

export function useFlowOAuth(config: OAuthConfig) {
  const { teamId, flowId: flowIdInput, onSuccess, onError, provider = 'slack' } = config

  // Support both static and reactive flowId
  const flowId = computed(() => {
    if (flowIdInput === undefined) return undefined
    return isRef(flowIdInput) ? flowIdInput.value : flowIdInput
  })

  const waitingForOAuth = ref(false)
  const toast = useToast()

  /**
   * Build OAuth install URL
   */
  const oauthInstallUrl = computed(() => {
    if (!teamId) return '#'
    const url = new URL(`/api/oauth/${provider}/install`, window.location.origin)
    url.searchParams.set('teamId', teamId)
    if (flowId.value) {
      url.searchParams.set('flowId', flowId.value)
    }
    // Pass opener origin so success page knows where to postMessage
    url.searchParams.set('openerOrigin', window.location.origin)
    return url.pathname + url.search
  })

  /**
   * Open OAuth popup window
   */
  function openOAuthPopup(event?: Event) {
    // Ensure we're on the client
    if (!process.client) {
      console.warn('[OAuth Popup] Cannot open popup during SSR')
      return
    }

    // Prevent any default behavior
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    console.log('[OAuth Popup] Opening popup with URL:', oauthInstallUrl.value)
    console.log('[OAuth Popup] Team ID:', teamId)
    console.log('[OAuth Popup] Provider:', provider)

    waitingForOAuth.value = true

    const width = 600
    const height = 800
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2

    const features = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`

    // Open popup
    const popup = window.open(
      oauthInstallUrl.value,
      `${provider}-oauth`,
      features
    )

    if (popup) {
      popup.focus()
      toast.add({
        title: `Opening ${provider.charAt(0).toUpperCase() + provider.slice(1)} Authorization`,
        description: 'Complete the authorization in the popup window',
        color: 'primary',
        timeout: 5000
      })
    } else {
      console.error('[OAuth Popup] Failed to open popup - check popup blocker')
      waitingForOAuth.value = false
      toast.add({
        title: 'Popup Blocked',
        description: 'Please allow popups for this site and try again',
        color: 'error',
        timeout: 8000
      })
    }
  }

  /**
   * Handle OAuth success message from popup
   */
  async function handleOAuthMessage(event: MessageEvent) {
    console.log('[OAuth Message] Received message:', event.data)

    if (event.data?.type === 'oauth-success') {
      // Merge OAuth credentials
      if (event.data.credentials) {
        console.log('[OAuth Message] OAuth succeeded, calling onSuccess handler')

        toast.add({
          title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Connected!`,
          description: 'OAuth credentials received successfully.',
          color: 'success',
          timeout: 5000
        })

        // Call success handler if provided
        if (onSuccess) {
          onSuccess(event.data.credentials)
        }
      }

      // Reset waiting flag
      waitingForOAuth.value = false
    }

    if (event.data?.type === 'oauth-error') {
      console.error('[OAuth Message] OAuth failed:', event.data.error)

      toast.add({
        title: 'OAuth Failed',
        description: event.data.error || 'Authorization failed. Please try again.',
        color: 'error',
        timeout: 8000
      })

      // Call error handler if provided
      if (onError) {
        onError(new Error(event.data.error || 'OAuth failed'))
      }

      waitingForOAuth.value = false
    }
  }

  // Setup message listener on mount
  onMounted(() => {
    window.addEventListener('message', handleOAuthMessage)
  })

  // Cleanup listener on unmount
  onBeforeUnmount(() => {
    window.removeEventListener('message', handleOAuthMessage)
  })

  return {
    /**
     * Open OAuth popup window
     */
    openOAuthPopup,

    /**
     * Whether we're waiting for OAuth to complete
     */
    waitingForOAuth,

    /**
     * OAuth install URL (for external use if needed)
     */
    oauthInstallUrl,
  }
}
