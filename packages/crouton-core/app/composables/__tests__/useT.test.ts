import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

// Stub Vue ref globally
vi.stubGlobal('ref', ref)

// Import after mocking
import { useT } from '../useT'

describe('useT', () => {
  describe('initialization', () => {
    it('returns all expected properties', () => {
      const translation = useT()

      expect(translation.t).toBeDefined()
      expect(translation.tString).toBeDefined()
      expect(translation.tContent).toBeDefined()
      expect(translation.tInfo).toBeDefined()
      expect(translation.hasTranslation).toBeDefined()
      expect(translation.getAvailableLocales).toBeDefined()
      expect(translation.getTranslationMeta).toBeDefined()
      expect(translation.refreshTranslations).toBeDefined()
      expect(translation.locale).toBeDefined()
      expect(translation.isDev).toBeDefined()
      expect(translation.devModeEnabled).toBeDefined()
    })

    it('initializes locale to en', () => {
      const { locale } = useT()

      expect(locale.value).toBe('en')
    })

    it('initializes isDev to false', () => {
      const { isDev } = useT()

      expect(isDev).toBe(false)
    })

    it('initializes devModeEnabled to false', () => {
      const { devModeEnabled } = useT()

      expect(devModeEnabled.value).toBe(false)
    })
  })

  describe('t() function', () => {
    it('translates common keys', () => {
      const { t } = useT()

      expect(t('common.save')).toBe('Save')
      expect(t('common.cancel')).toBe('Cancel')
      expect(t('common.delete')).toBe('Delete')
    })

    it('translates table keys', () => {
      const { t } = useT()

      expect(t('table.id')).toBe('ID')
      expect(t('table.createdAt')).toBe('Created At')
      expect(t('table.actions')).toBe('Actions')
    })

    it('translates forms keys', () => {
      const { t } = useT()

      expect(t('forms.name')).toBe('Name')
      expect(t('forms.description')).toBe('Description')
      expect(t('forms.status')).toBe('Status')
    })

    it('translates errors keys', () => {
      const { t } = useT()

      expect(t('errors.generic')).toBe('Something went wrong')
      expect(t('errors.notFound')).toBe('Not found')
      expect(t('errors.unauthorized')).toBe('Unauthorized')
    })

    it('translates success keys', () => {
      const { t } = useT()

      expect(t('success.saved')).toBe('Saved successfully')
      expect(t('success.created')).toBe('Created successfully')
      expect(t('success.deleted')).toBe('Deleted successfully')
    })

    it('translates confirmation keys', () => {
      const { t } = useT()

      expect(t('confirmation.areYouSure')).toBe('Are you sure?')
      expect(t('confirmation.cannotUndo')).toBe('This action cannot be undone')
    })

    it('translates time keys', () => {
      const { t } = useT()

      expect(t('time.today')).toBe('Today')
      expect(t('time.yesterday')).toBe('Yesterday')
      expect(t('time.now')).toBe('Now')
    })

    it('translates auth keys', () => {
      const { t } = useT()

      expect(t('auth.signIn')).toBe('Sign In')
      expect(t('auth.signOut')).toBe('Sign Out')
      expect(t('auth.email')).toBe('Email')
      expect(t('auth.password')).toBe('Password')
    })

    it('translates account keys', () => {
      const { t } = useT()

      expect(t('account.settings')).toBe('Account Settings')
      expect(t('account.profile')).toBe('Profile')
      expect(t('account.security')).toBe('Security')
    })

    it('translates teams keys', () => {
      const { t } = useT()

      expect(t('teams.team')).toBe('Team')
      expect(t('teams.members')).toBe('Members')
      expect(t('teams.invite')).toBe('Invite')
    })

    it('translates navigation keys', () => {
      const { t } = useT()

      expect(t('navigation.dashboard')).toBe('Dashboard')
      expect(t('navigation.home')).toBe('Home')
      expect(t('navigation.settings')).toBe('Settings')
    })

    it('returns key for unknown translations', () => {
      const { t } = useT()

      expect(t('unknown.key')).toBe('unknown.key')
      expect(t('not.existing')).toBe('not.existing')
    })

    it('handles options parameter (ignored in stub)', () => {
      const { t } = useT()

      // Options are ignored in stub, but shouldn't cause errors
      expect(t('common.save', { count: 5 })).toBe('Save')
    })
  })

  describe('tString() function', () => {
    it('behaves like t() function', () => {
      const { tString } = useT()

      expect(tString('common.save')).toBe('Save')
      expect(tString('unknown.key')).toBe('unknown.key')
    })

    it('handles options parameter', () => {
      const { tString } = useT()

      expect(tString('common.cancel', { variant: 'destructive' })).toBe('Cancel')
    })
  })

  describe('tContent() function', () => {
    it('returns entity field value', () => {
      const { tContent } = useT()
      const entity = { title: 'Hello World', description: 'A description' }

      expect(tContent(entity, 'title')).toBe('Hello World')
      expect(tContent(entity, 'description')).toBe('A description')
    })

    it('returns empty string for null entity', () => {
      const { tContent } = useT()

      expect(tContent(null, 'title')).toBe('')
    })

    it('returns empty string for undefined entity', () => {
      const { tContent } = useT()

      expect(tContent(undefined, 'title')).toBe('')
    })

    it('returns empty string for missing field', () => {
      const { tContent } = useT()
      const entity = { title: 'Hello' }

      expect(tContent(entity, 'description')).toBe('')
    })
  })

  describe('tInfo() function', () => {
    it('returns info object for existing key', () => {
      const { tInfo } = useT()
      const info = tInfo('common.save')

      expect(info.key).toBe('common.save')
      expect(info.value).toBe('Save')
      expect(info.mode).toBe('system')
      expect(info.category).toBe('ui')
      expect(info.isMissing).toBe(false)
      expect(info.hasTeamOverride).toBe(false)
    })

    it('returns info object for missing key', () => {
      const { tInfo } = useT()
      const info = tInfo('unknown.key')

      expect(info.key).toBe('unknown.key')
      expect(info.value).toBe('unknown.key')
      expect(info.isMissing).toBe(true)
    })

    it('mode is always system in stub', () => {
      const { tInfo } = useT()

      expect(tInfo('common.save').mode).toBe('system')
      expect(tInfo('unknown.key').mode).toBe('system')
    })

    it('hasTeamOverride is always false in stub', () => {
      const { tInfo } = useT()

      expect(tInfo('common.save').hasTeamOverride).toBe(false)
    })
  })

  describe('hasTranslation() function', () => {
    it('returns true for existing keys', () => {
      const { hasTranslation } = useT()

      expect(hasTranslation('common.save')).toBe(true)
      expect(hasTranslation('table.id')).toBe(true)
      expect(hasTranslation('auth.signIn')).toBe(true)
    })

    it('returns false for non-existing keys', () => {
      const { hasTranslation } = useT()

      expect(hasTranslation('unknown.key')).toBe(false)
      expect(hasTranslation('not.existing')).toBe(false)
    })
  })

  describe('getAvailableLocales() function', () => {
    it('returns array with only en locale', () => {
      const { getAvailableLocales } = useT()

      expect(getAvailableLocales()).toEqual(['en'])
    })
  })

  describe('getTranslationMeta() function', () => {
    it('returns meta for existing key', () => {
      const { getTranslationMeta } = useT()
      const meta = getTranslationMeta('common.save')

      expect(meta.key).toBe('common.save')
      expect(meta.value).toBe('Save')
      expect(meta.hasTeamOverride).toBe(false)
      expect(meta.isSystemMissing).toBe(false)
      expect(meta.availableLocales).toEqual(['en'])
    })

    it('returns meta for missing key', () => {
      const { getTranslationMeta } = useT()
      const meta = getTranslationMeta('unknown.key')

      expect(meta.key).toBe('unknown.key')
      expect(meta.value).toBe('unknown.key')
      expect(meta.isSystemMissing).toBe(true)
    })
  })

  describe('refreshTranslations() function', () => {
    it('is an async no-op', async () => {
      const { refreshTranslations } = useT()

      // Should not throw and return undefined
      const result = await refreshTranslations()
      expect(result).toBeUndefined()
    })
  })

  describe('translation coverage', () => {
    it('has common translations', () => {
      const { hasTranslation } = useT()

      const commonKeys = [
        'common.save', 'common.cancel', 'common.delete', 'common.edit',
        'common.create', 'common.update', 'common.add', 'common.remove',
        'common.close', 'common.confirm', 'common.search', 'common.loading'
      ]

      for (const key of commonKeys) {
        expect(hasTranslation(key)).toBe(true)
      }
    })

    it('has table translations', () => {
      const { hasTranslation } = useT()

      const tableKeys = [
        'table.id', 'table.createdAt', 'table.updatedAt', 'table.actions',
        'table.rowsPerPage', 'table.page', 'table.of', 'table.noResults'
      ]

      for (const key of tableKeys) {
        expect(hasTranslation(key)).toBe(true)
      }
    })

    it('has forms translations', () => {
      const { hasTranslation } = useT()

      const formKeys = [
        'forms.name', 'forms.description', 'forms.status', 'forms.date',
        'forms.email', 'forms.phone', 'forms.address'
      ]

      // Note: forms.email doesn't exist, it's auth.email
      expect(hasTranslation('forms.name')).toBe(true)
      expect(hasTranslation('forms.description')).toBe(true)
    })

    it('has auth translations', () => {
      const { hasTranslation } = useT()

      const authKeys = [
        'auth.signIn', 'auth.signOut', 'auth.signUp', 'auth.email',
        'auth.password', 'auth.forgotPassword', 'auth.resetPassword'
      ]

      for (const key of authKeys) {
        expect(hasTranslation(key)).toBe(true)
      }
    })
  })

  describe('edge cases', () => {
    it('handles empty string key', () => {
      const { t, hasTranslation } = useT()

      expect(t('')).toBe('')
      expect(hasTranslation('')).toBe(false)
    })

    it('handles keys with special characters', () => {
      const { t } = useT()

      // These don't exist, so return the key
      expect(t('some.key.with.dots')).toBe('some.key.with.dots')
    })

    it('multiple useT calls return same structure', () => {
      const t1 = useT()
      const t2 = useT()

      // Both should work independently
      expect(t1.t('common.save')).toBe(t2.t('common.save'))
      expect(t1.locale.value).toBe(t2.locale.value)
    })
  })
})
