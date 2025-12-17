<script setup lang="ts">
/**
 * Two-Factor Authentication Setup Component
 *
 * Enables/disables 2FA with TOTP authenticator app.
 * Shows QR code for setup and manages backup codes.
 *
 * @example
 * ```vue
 * <AccountTwoFactorSetup />
 * ```
 */
import type { TwoFactorStatus, BackupCodeInfo } from '../../composables/useAuth'

interface Props {
  /** External loading state */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const {
  has2FA,
  enable2FA,
  disable2FA,
  verifyTotp,
  generateBackupCodes,
  viewBackupCodes,
  get2FAStatus,
} = useAuth()
const toast = useToast()

// States
const status = ref<TwoFactorStatus>({
  enabled: false,
  hasTotp: false,
  hasBackupCodes: false,
})
const statusLoading = ref(false)

// Setup flow states
const showSetupModal = ref(false)
const setupStep = ref<'password' | 'qr' | 'verify' | 'backup'>('password')
const totpUri = ref('')
const totpSecret = ref('')
const backupCodes = ref<string[]>([])

// Form states
const passwordInput = ref('')
const verifyCode = ref('')

// Loading states
const setupLoading = ref(false)
const disableLoading = ref(false)
const viewCodesLoading = ref(false)

const isLoading = computed(() => props.loading || statusLoading.value)

// Load 2FA status
async function loadStatus() {
  statusLoading.value = true
  try {
    status.value = await get2FAStatus()
  } catch (e) {
    // Silently fail - status will show as disabled
    console.error('Failed to load 2FA status:', e)
  } finally {
    statusLoading.value = false
  }
}

// Initialize
onMounted(() => {
  if (has2FA.value) {
    loadStatus()
  }
})

// Start setup flow
function startSetup() {
  setupStep.value = 'password'
  passwordInput.value = ''
  verifyCode.value = ''
  totpUri.value = ''
  totpSecret.value = ''
  backupCodes.value = []
  showSetupModal.value = true
}

// Handle password submission for setup
async function handlePasswordSubmit() {
  if (!passwordInput.value) return

  setupLoading.value = true
  try {
    const data = await enable2FA(passwordInput.value)
    totpUri.value = data.totpURI
    totpSecret.value = data.secret
    setupStep.value = 'qr'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to enable 2FA'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    setupLoading.value = false
  }
}

// Handle TOTP verification
async function handleVerifySubmit() {
  if (!verifyCode.value || verifyCode.value.length !== 6) {
    toast.add({
      title: 'Invalid code',
      description: 'Please enter a 6-digit code',
      color: 'error',
    })
    return
  }

  setupLoading.value = true
  try {
    await verifyTotp({ code: verifyCode.value })

    // Generate backup codes
    const codes = await generateBackupCodes(passwordInput.value)
    backupCodes.value = codes

    setupStep.value = 'backup'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid code'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    setupLoading.value = false
  }
}

// Complete setup
async function completeSetup() {
  showSetupModal.value = false
  await loadStatus()
  toast.add({
    title: '2FA enabled',
    description: 'Two-factor authentication is now active.',
    color: 'success',
  })
}

// Disable 2FA
const showDisableModal = ref(false)
const disablePassword = ref('')

async function handleDisable() {
  if (!disablePassword.value) return

  disableLoading.value = true
  try {
    await disable2FA(disablePassword.value)

    showDisableModal.value = false
    disablePassword.value = ''
    await loadStatus()

    toast.add({
      title: '2FA disabled',
      description: 'Two-factor authentication has been turned off.',
      color: 'success',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to disable 2FA'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    disableLoading.value = false
  }
}

// View backup codes
const showBackupModal = ref(false)
const backupPassword = ref('')
const viewedBackupCodes = ref<BackupCodeInfo[]>([])

async function handleViewBackupCodes() {
  if (!backupPassword.value) return

  viewCodesLoading.value = true
  try {
    viewedBackupCodes.value = await viewBackupCodes(backupPassword.value)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to view backup codes'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    viewCodesLoading.value = false
  }
}

// Copy backup codes
async function copyBackupCodes(codes: string[]) {
  const text = codes.join('\n')
  await navigator.clipboard.writeText(text)
  toast.add({
    title: 'Copied',
    description: 'Backup codes copied to clipboard',
    color: 'success',
  })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Two-Factor Authentication</h3>
        <p class="text-sm text-muted mt-1">
          Add an extra layer of security to your account.
        </p>
      </div>
    </div>

    <!-- 2FA not enabled in app -->
    <UAlert
      v-if="!has2FA"
      color="info"
      icon="i-lucide-info"
      title="2FA not enabled"
      description="Two-factor authentication is not enabled for this application."
    />

    <!-- Loading -->
    <div v-else-if="statusLoading" class="space-y-3">
      <USkeleton class="h-20 w-full rounded-lg" />
    </div>

    <!-- 2FA Status -->
    <div v-else>
      <!-- Enabled -->
      <div
        v-if="status.enabled"
        class="p-4 rounded-lg border border-success/30 bg-success/5"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-10 rounded-lg bg-success/10">
            <UIcon
              name="i-lucide-shield-check"
              class="size-5 text-success"
            />
          </div>
          <div class="flex-1">
            <p class="font-medium text-success">2FA is enabled</p>
            <p class="text-sm text-muted">
              Your account is protected with an authenticator app.
            </p>
          </div>
        </div>

        <div class="flex gap-3 mt-4">
          <UButton
            variant="soft"
            icon="i-lucide-key"
            @click="showBackupModal = true; backupPassword = ''; viewedBackupCodes = []"
          >
            View backup codes
          </UButton>
          <UButton
            variant="ghost"
            color="error"
            icon="i-lucide-shield-off"
            @click="showDisableModal = true; disablePassword = ''"
          >
            Disable 2FA
          </UButton>
        </div>
      </div>

      <!-- Not enabled -->
      <div
        v-else
        class="p-4 rounded-lg border border-warning/30 bg-warning/5"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-10 rounded-lg bg-warning/10">
            <UIcon
              name="i-lucide-shield-alert"
              class="size-5 text-warning"
            />
          </div>
          <div class="flex-1">
            <p class="font-medium text-warning">2FA is not enabled</p>
            <p class="text-sm text-muted">
              Protect your account with an authenticator app.
            </p>
          </div>
        </div>

        <UButton
          class="mt-4"
          icon="i-lucide-shield-plus"
          @click="startSetup"
        >
          Enable 2FA
        </UButton>
      </div>
    </div>

    <!-- Info -->
    <UAlert
      v-if="has2FA"
      color="info"
      variant="soft"
      icon="i-lucide-smartphone"
    >
      <template #title>About Two-Factor Authentication</template>
      <template #description>
        2FA adds an extra layer of security by requiring a code from your authenticator
        app (like Google Authenticator, Authy, or 1Password) when signing in.
      </template>
    </UAlert>

    <!-- Setup Modal -->
    <UModal
      v-model:open="showSetupModal"
      :dismissible="setupStep === 'password'"
    >
      <template #content>
        <div class="p-6 space-y-6">
          <!-- Step: Password -->
          <div v-if="setupStep === 'password'">
            <h3 class="text-lg font-semibold">Enable Two-Factor Authentication</h3>
            <p class="text-sm text-muted mt-1">
              Enter your password to continue.
            </p>

            <div class="mt-4">
              <UInput
                v-model="passwordInput"
                type="password"
                placeholder="Enter your password"
                icon="i-lucide-lock"
                :disabled="setupLoading"
                @keyup.enter="handlePasswordSubmit"
              />
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <UButton
                variant="ghost"
                :disabled="setupLoading"
                @click="showSetupModal = false"
              >
                Cancel
              </UButton>
              <UButton
                :loading="setupLoading"
                :disabled="!passwordInput"
                @click="handlePasswordSubmit"
              >
                Continue
              </UButton>
            </div>
          </div>

          <!-- Step: QR Code -->
          <div v-else-if="setupStep === 'qr'">
            <h3 class="text-lg font-semibold">Scan QR Code</h3>
            <p class="text-sm text-muted mt-1">
              Scan this QR code with your authenticator app.
            </p>

            <div class="flex flex-col items-center gap-4 mt-4">
              <!-- QR Code placeholder - needs qrcode library -->
              <div class="p-4 bg-white rounded-lg">
                <img
                  v-if="totpUri"
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`"
                  alt="2FA QR Code"
                  class="size-48"
                />
              </div>

              <div class="text-center">
                <p class="text-sm text-muted">Or enter this code manually:</p>
                <code class="text-sm font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                  {{ totpSecret }}
                </code>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <UButton
                variant="ghost"
                @click="setupStep = 'password'"
              >
                Back
              </UButton>
              <UButton @click="setupStep = 'verify'">
                Continue
              </UButton>
            </div>
          </div>

          <!-- Step: Verify -->
          <div v-else-if="setupStep === 'verify'">
            <h3 class="text-lg font-semibold">Verify Code</h3>
            <p class="text-sm text-muted mt-1">
              Enter the 6-digit code from your authenticator app.
            </p>

            <div class="mt-4">
              <UInput
                v-model="verifyCode"
                placeholder="000000"
                icon="i-lucide-hash"
                maxlength="6"
                class="text-center font-mono text-lg"
                :disabled="setupLoading"
                @keyup.enter="handleVerifySubmit"
              />
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <UButton
                variant="ghost"
                :disabled="setupLoading"
                @click="setupStep = 'qr'"
              >
                Back
              </UButton>
              <UButton
                :loading="setupLoading"
                :disabled="verifyCode.length !== 6"
                @click="handleVerifySubmit"
              >
                Verify
              </UButton>
            </div>
          </div>

          <!-- Step: Backup Codes -->
          <div v-else-if="setupStep === 'backup'">
            <h3 class="text-lg font-semibold">Save Backup Codes</h3>
            <p class="text-sm text-muted mt-1">
              Save these backup codes in a secure place. Each can only be used once.
            </p>

            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-alert-triangle"
              class="mt-4"
            >
              <template #description>
                If you lose access to your authenticator app, you'll need these codes to sign in.
              </template>
            </UAlert>

            <div class="grid grid-cols-2 gap-2 mt-4 p-4 bg-muted rounded-lg">
              <code
                v-for="code in backupCodes"
                :key="code"
                class="font-mono text-sm"
              >
                {{ code }}
              </code>
            </div>

            <div class="flex justify-between mt-6">
              <UButton
                variant="soft"
                icon="i-lucide-copy"
                @click="copyBackupCodes(backupCodes)"
              >
                Copy codes
              </UButton>
              <UButton @click="completeSetup">
                Done
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Disable Modal -->
    <UModal v-model:open="showDisableModal">
      <template #content>
        <div class="p-6 space-y-6">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 rounded-full bg-error/10">
              <UIcon
                name="i-lucide-shield-off"
                class="size-5 text-error"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold">Disable 2FA</h3>
              <p class="text-sm text-muted">
                This will reduce your account security.
              </p>
            </div>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-alert-triangle"
          >
            <template #description>
              Without 2FA, anyone with your password can access your account.
            </template>
          </UAlert>

          <UInput
            v-model="disablePassword"
            type="password"
            placeholder="Enter your password to confirm"
            icon="i-lucide-lock"
            :disabled="disableLoading"
          />

          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              :disabled="disableLoading"
              @click="showDisableModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="disableLoading"
              :disabled="!disablePassword"
              @click="handleDisable"
            >
              Disable 2FA
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- View Backup Codes Modal -->
    <UModal v-model:open="showBackupModal">
      <template #content>
        <div class="p-6 space-y-6">
          <h3 class="text-lg font-semibold">Backup Codes</h3>

          <!-- Password entry -->
          <div v-if="viewedBackupCodes.length === 0">
            <p class="text-sm text-muted">
              Enter your password to view your backup codes.
            </p>

            <UInput
              v-model="backupPassword"
              type="password"
              placeholder="Enter your password"
              icon="i-lucide-lock"
              class="mt-4"
              :disabled="viewCodesLoading"
              @keyup.enter="handleViewBackupCodes"
            />

            <div class="flex justify-end gap-3 mt-6">
              <UButton
                variant="ghost"
                :disabled="viewCodesLoading"
                @click="showBackupModal = false"
              >
                Cancel
              </UButton>
              <UButton
                :loading="viewCodesLoading"
                :disabled="!backupPassword"
                @click="handleViewBackupCodes"
              >
                View codes
              </UButton>
            </div>
          </div>

          <!-- Show codes -->
          <div v-else>
            <div class="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              <div
                v-for="codeInfo in viewedBackupCodes"
                :key="codeInfo.code"
                class="flex items-center gap-2"
              >
                <code
                  class="font-mono text-sm"
                  :class="{ 'line-through text-muted': codeInfo.used }"
                >
                  {{ codeInfo.code }}
                </code>
                <UIcon
                  v-if="codeInfo.used"
                  name="i-lucide-check"
                  class="size-4 text-muted"
                />
              </div>
            </div>

            <p class="text-sm text-muted mt-4">
              {{ viewedBackupCodes.filter((c) => !c.used).length }} codes remaining.
            </p>

            <div class="flex justify-between mt-6">
              <UButton
                variant="soft"
                icon="i-lucide-copy"
                @click="copyBackupCodes(viewedBackupCodes.filter((c) => !c.used).map((c) => c.code))"
              >
                Copy unused codes
              </UButton>
              <UButton @click="showBackupModal = false">
                Close
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
