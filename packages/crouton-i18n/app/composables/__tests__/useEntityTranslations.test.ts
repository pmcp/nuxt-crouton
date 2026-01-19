import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Mock locale
let mockLocale = ref('en')

// Set up all global mocks
vi.stubGlobal('ref', ref)

vi.stubGlobal('useI18n', () => ({
  locale: mockLocale
}))

// Import composable after mocking
import { useEntityTranslations } from '../useEntityTranslations'

describe('useEntityTranslations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocale = ref('en')
  })

  describe('initialization', () => {
    it('returns t function', () => {
      const result = useEntityTranslations()

      expect(result).toHaveProperty('t')
      expect(typeof result.t).toBe('function')
    })
  })

  describe('t() - entity field translation', () => {
    it('returns translated field from entity for current locale', () => {
      const entity = {
        name: 'Original Name',
        translations: {
          en: { name: 'English Name' },
          nl: { name: 'Dutch Name' }
        }
      }

      const { t } = useEntityTranslations()
      const result = t(entity, 'name')

      expect(result).toBe('English Name')
    })

    it('returns translation for different locale', () => {
      mockLocale = ref('nl')

      const entity = {
        name: 'Original Name',
        translations: {
          en: { name: 'English Name' },
          nl: { name: 'Dutch Name' }
        }
      }

      const { t } = useEntityTranslations()
      const result = t(entity, 'name')

      expect(result).toBe('Dutch Name')
    })

    it('falls back to entity field when translation is missing', () => {
      const entity = {
        name: 'Original Name',
        translations: {
          en: {} // No name field in translations
        }
      }

      const { t } = useEntityTranslations()
      const result = t(entity, 'name')

      expect(result).toBe('Original Name')
    })

    it('falls back to entity field when locale is missing', () => {
      mockLocale = ref('de') // German not in translations

      const entity = {
        name: 'Original Name',
        translations: {
          en: { name: 'English Name' }
        }
      }

      const { t } = useEntityTranslations()
      const result = t(entity, 'name')

      expect(result).toBe('Original Name')
    })

    it('falls back to entity field when translations object is missing', () => {
      const entity = {
        name: 'Original Name'
        // No translations property
      }

      const { t } = useEntityTranslations()
      const result = t(entity, 'name')

      expect(result).toBe('Original Name')
    })

    it('returns empty string for null entity', () => {
      const { t } = useEntityTranslations()
      const result = t(null, 'name')

      expect(result).toBe('')
    })

    it('returns empty string for undefined entity', () => {
      const { t } = useEntityTranslations()
      const result = t(undefined, 'name')

      expect(result).toBe('')
    })

    it('returns empty string when field is missing from both translations and entity', () => {
      const entity = {
        title: 'Some Title',
        translations: {
          en: { title: 'English Title' }
        }
      }

      const { t } = useEntityTranslations()
      const result = t(entity, 'name') // name doesn't exist

      expect(result).toBe('')
    })

    it('works with nested entity objects', () => {
      const entity = {
        name: 'Original',
        description: 'Original Description',
        translations: {
          en: {
            name: 'English Name',
            description: 'English Description'
          },
          fr: {
            name: 'French Name',
            description: 'French Description'
          }
        }
      }

      const { t } = useEntityTranslations()

      expect(t(entity, 'name')).toBe('English Name')
      expect(t(entity, 'description')).toBe('English Description')
    })
  })
})
