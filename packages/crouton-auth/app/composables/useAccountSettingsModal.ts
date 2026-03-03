/**
 * useAccountSettingsModal
 *
 * Shared state for the account settings modal.
 * Used by public pages nav to open settings in a modal
 * instead of navigating to /account.
 */
export function useAccountSettingsModal() {
  const isOpen = useState('account-settings-open', () => false)
  const defaultTab = useState('account-settings-tab', () => 'profile')

  function open(tab = 'profile') {
    defaultTab.value = tab
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    defaultTab: readonly(defaultTab),
    open,
    close
  }
}
