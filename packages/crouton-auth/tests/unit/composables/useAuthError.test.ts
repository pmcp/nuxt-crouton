import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'

// Import after mocks
import { useAuthError, createErrorLogger } from '../../../app/composables/useAuthError'
import { AuthError, AUTH_ERROR_CODES } from '../../../app/utils/errors'

// Mock toast
const mockToast = {
  add: vi.fn()
}

// Setup global mocks
vi.stubGlobal('useToast', () => mockToast)
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)

describe('useAuthError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('should have null error initially', () => {
      const { error, errorMessage, errorCode, hasError } = useAuthError()
      expect(error.value).toBeNull()
      expect(errorMessage.value).toBeNull()
      expect(errorCode.value).toBeNull()
      expect(hasError.value).toBe(false)
    })
  })

  describe('handleError', () => {
    it('should set error state from AuthError', () => {
      const { error, errorCode, hasError, handleError } = useAuthError()
      const authError = new AuthError(AUTH_ERROR_CODES.AUTH_UNAUTHORIZED, 'Unauthorized')

      handleError(authError)

      expect(error.value).toBe(authError)
      expect(errorCode.value).toBe(AUTH_ERROR_CODES.AUTH_UNAUTHORIZED)
      expect(hasError.value).toBe(true)
    })

    it('should convert regular Error to AuthError', () => {
      const { error, handleError } = useAuthError()
      const regularError = new Error('Something went wrong')

      handleError(regularError)

      expect(error.value).toBeInstanceOf(AuthError)
      expect(error.value?.message).toBe('Something went wrong')
    })

    it('should show toast notification by default', () => {
      const { handleError } = useAuthError()
      const authError = new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials')

      handleError(authError)

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          color: 'error'
        })
      )
    })

    it('should not show toast when showToast is false', () => {
      const { handleError } = useAuthError({ showToast: false })
      const authError = new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials')

      handleError(authError)

      expect(mockToast.add).not.toHaveBeenCalled()
    })

    it('should call custom onError handler', () => {
      const onError = vi.fn()
      const { handleError } = useAuthError({ onError })
      const authError = new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials')

      handleError(authError)

      expect(onError).toHaveBeenCalledWith(authError)
    })

    it('should return the AuthError', () => {
      const { handleError } = useAuthError()
      const authError = new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials')

      const result = handleError(authError)

      expect(result).toBe(authError)
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      const { error, hasError, handleError, clearError } = useAuthError()
      handleError(new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Error'))

      expect(hasError.value).toBe(true)

      clearError()

      expect(error.value).toBeNull()
      expect(hasError.value).toBe(false)
    })
  })

  describe('isError', () => {
    it('should return true when error matches code', () => {
      const { handleError, isError } = useAuthError()
      handleError(new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Error'))

      expect(isError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS)).toBe(true)
      expect(isError(AUTH_ERROR_CODES.AUTH_UNAUTHORIZED)).toBe(false)
    })

    it('should return false when no error', () => {
      const { isError } = useAuthError()
      expect(isError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS)).toBe(false)
    })
  })

  describe('withError', () => {
    it('should return result on success', async () => {
      const { withError } = useAuthError()
      const successFn = vi.fn().mockResolvedValue('success')
      const wrapped = withError(successFn)

      const result = await wrapped()

      expect(result).toBe('success')
      expect(successFn).toHaveBeenCalled()
    })

    it('should handle error and return undefined on failure', async () => {
      const { withError, error, hasError } = useAuthError()
      const failFn = vi.fn().mockRejectedValue(new Error('Failed'))
      const wrapped = withError(failFn)

      const result = await wrapped()

      expect(result).toBeUndefined()
      expect(hasError.value).toBe(true)
      expect(error.value).toBeInstanceOf(AuthError)
    })

    it('should clear error before execution by default', async () => {
      const { withError, handleError, hasError } = useAuthError()
      handleError(new Error('Previous error'))
      expect(hasError.value).toBe(true)

      const successFn = vi.fn().mockResolvedValue('success')
      const wrapped = withError(successFn)
      await wrapped()

      expect(hasError.value).toBe(false)
    })

    it('should not clear error when clearOnStart is false', async () => {
      const { withError, handleError, hasError, error } = useAuthError()
      const previousError = new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Previous')
      handleError(previousError)

      const successFn = vi.fn().mockResolvedValue('success')
      const wrapped = withError(successFn, { clearOnStart: false })
      await wrapped()

      expect(hasError.value).toBe(true)
      expect(error.value).toBe(previousError)
    })

    it('should pass arguments to wrapped function', async () => {
      const { withError } = useAuthError()
      const fn = vi.fn().mockResolvedValue('success')
      const wrapped = withError(fn)

      await wrapped('arg1', 'arg2')

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('isNetworkError', () => {
    it('should return true for network errors', () => {
      const { handleError, isNetworkError } = useAuthError()

      handleError(new AuthError(AUTH_ERROR_CODES.NETWORK_ERROR, 'Network error'))
      expect(isNetworkError.value).toBe(true)
    })

    it('should return true for timeout errors', () => {
      const { handleError, isNetworkError } = useAuthError()

      handleError(new AuthError(AUTH_ERROR_CODES.NETWORK_TIMEOUT, 'Timeout'))
      expect(isNetworkError.value).toBe(true)
    })

    it('should return false for non-network errors', () => {
      const { handleError, isNetworkError } = useAuthError()

      handleError(new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid'))
      expect(isNetworkError.value).toBe(false)
    })
  })

  describe('isAuthenticationError', () => {
    it('should return true for unauthorized errors', () => {
      const { handleError, isAuthenticationError } = useAuthError()

      handleError(new AuthError(AUTH_ERROR_CODES.AUTH_UNAUTHORIZED, 'Unauthorized'))
      expect(isAuthenticationError.value).toBe(true)
    })

    it('should return true for session expired errors', () => {
      const { handleError, isAuthenticationError } = useAuthError()

      handleError(new AuthError(AUTH_ERROR_CODES.AUTH_SESSION_EXPIRED, 'Session expired'))
      expect(isAuthenticationError.value).toBe(true)
    })

    it('should return false for other errors', () => {
      const { handleError, isAuthenticationError } = useAuthError()

      handleError(new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid'))
      expect(isAuthenticationError.value).toBe(false)
    })
  })
})

describe('createErrorLogger', () => {
  it('should log errors with prefix', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createErrorLogger('[TEST]')
    const error = new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Test error')

    logger(error)

    expect(consoleSpy).toHaveBeenCalledWith('[TEST] Error:', expect.objectContaining({
      code: AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      message: 'Test error'
    }))

    consoleSpy.mockRestore()
  })

  it('should use default prefix when not specified', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createErrorLogger()
    const error = new AuthError(AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Test error')

    logger(error)

    expect(consoleSpy).toHaveBeenCalledWith('[@crouton/auth] Error:', expect.any(Object))

    consoleSpy.mockRestore()
  })
})
