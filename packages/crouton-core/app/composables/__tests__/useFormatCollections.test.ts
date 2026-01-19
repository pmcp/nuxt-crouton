import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useAppConfig before importing the composable
const mockAppConfig = {
  croutonCollections: {
    blogPosts: { layer: 'blog' },
    blogCategories: { layer: 'blog' },
    shopProducts: { layer: 'shop' },
    users: {} // No layer prefix
  }
}

vi.stubGlobal('useAppConfig', () => mockAppConfig)

// Import after mocking
import { useFormatCollections } from '../useFormatCollections'

describe('useFormatCollections', () => {
  describe('stripLayerPrefix', () => {
    it('removes blog prefix from blogPosts', () => {
      const { stripLayerPrefix } = useFormatCollections()
      expect(stripLayerPrefix('blogPosts')).toBe('posts')
    })

    it('removes shop prefix from shopProducts', () => {
      const { stripLayerPrefix } = useFormatCollections()
      expect(stripLayerPrefix('shopProducts')).toBe('products')
    })

    it('returns original value when no layer prefix matches', () => {
      const { stripLayerPrefix } = useFormatCollections()
      expect(stripLayerPrefix('users')).toBe('users')
    })

    it('handles empty string', () => {
      const { stripLayerPrefix } = useFormatCollections()
      expect(stripLayerPrefix('')).toBe('')
    })

    it('is case-insensitive for prefix matching', () => {
      const { stripLayerPrefix } = useFormatCollections()
      // Prefix matching is case-insensitive, but result preserves original casing
      expect(stripLayerPrefix('BlogPosts')).toBe('posts')
    })

    it('preserves casing after prefix removal', () => {
      const { stripLayerPrefix } = useFormatCollections()
      // First char is lowercased, rest preserves original casing
      expect(stripLayerPrefix('BLOGPOSTS')).toBe('pOSTS')
    })

    it('preserves original casing after prefix removal', () => {
      const { stripLayerPrefix } = useFormatCollections()
      // When blogCategories has 'blog' stripped, result starts lowercase
      expect(stripLayerPrefix('blogCategories')).toBe('categories')
    })
  })

  describe('camelToTitleCase', () => {
    it('converts simple camelCase to Title Case', () => {
      const { camelToTitleCase } = useFormatCollections()
      expect(camelToTitleCase('blogPosts')).toBe('Blog Posts')
    })

    it('handles single word', () => {
      const { camelToTitleCase } = useFormatCollections()
      expect(camelToTitleCase('users')).toBe('Users')
    })

    it('handles multiple capital letters', () => {
      const { camelToTitleCase } = useFormatCollections()
      expect(camelToTitleCase('userProfileSettings')).toBe('User Profile Settings')
    })

    it('handles already capitalized first letter', () => {
      const { camelToTitleCase } = useFormatCollections()
      expect(camelToTitleCase('Posts')).toBe('Posts')
    })

    it('handles empty string', () => {
      const { camelToTitleCase } = useFormatCollections()
      expect(camelToTitleCase('')).toBe('')
    })
  })

  describe('collectionWithCapital', () => {
    it('strips prefix and converts to title case', () => {
      const { collectionWithCapital } = useFormatCollections()
      expect(collectionWithCapital('blogPosts')).toBe('Posts')
    })

    it('just capitalizes when no prefix', () => {
      const { collectionWithCapital } = useFormatCollections()
      expect(collectionWithCapital('users')).toBe('Users')
    })

    it('handles empty string', () => {
      const { collectionWithCapital } = useFormatCollections()
      expect(collectionWithCapital('')).toBe('')
    })

    it('handles multi-word collection names', () => {
      const { collectionWithCapital } = useFormatCollections()
      expect(collectionWithCapital('blogCategories')).toBe('Categories')
    })
  })

  describe('collectionWithCapitalSingular', () => {
    describe('basic -s plurals', () => {
      it('converts posts to Post', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('blogPosts')).toBe('Post')
      })

      it('converts users to User', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('users')).toBe('User')
      })

      it('converts products to Product', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('shopProducts')).toBe('Product')
      })
    })

    describe('-ies to -y', () => {
      it('converts categories to Category', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('blogCategories')).toBe('Category')
      })

      it('converts companies to Company', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('companies')).toBe('Company')
      })

      it('converts policies to Policy', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('policies')).toBe('Policy')
      })
    })

    describe('-es sibilant endings', () => {
      it('converts boxes to Box', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('boxes')).toBe('Box')
      })

      it('converts watches to Watch', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('watches')).toBe('Watch')
      })

      it('converts dishes to Dish', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('dishes')).toBe('Dish')
      })

      it('converts classes to Class', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('classes')).toBe('Class')
      })

    })

    describe('-zzes endings (doubled z)', () => {
      it('converts quizzes to Quiz', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('quizzes')).toBe('Quiz')
      })

      it('converts fizzes to Fiz', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('fizzes')).toBe('Fiz')
      })
    })

    describe('-zes endings (single z)', () => {
      it('converts sizes to Size', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('sizes')).toBe('Size')
      })

      it('converts prizes to Prize', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('prizes')).toBe('Prize')
      })
    })

    describe('-oes endings', () => {
      it('converts heroes to Hero (consonant + o + es)', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('heroes')).toBe('Hero')
      })

      it('converts tomatoes to Tomato (consonant + o + es)', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('tomatoes')).toBe('Tomato')
      })

      it('converts echoes to Echo (consonant + o + es)', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('echoes')).toBe('Echo')
      })
    })

    describe('edge cases', () => {
      it('handles empty string', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('')).toBe('')
      })

      it('handles single character', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('s')).toBe('S')
      })

      it('handles words not ending in s', () => {
        const { collectionWithCapitalSingular } = useFormatCollections()
        expect(collectionWithCapitalSingular('data')).toBe('Data')
      })
    })
  })

  describe('toPascalCase', () => {
    it('capitalizes first letter', () => {
      const { toPascalCase } = useFormatCollections()
      expect(toPascalCase('posts')).toBe('Posts')
    })

    it('preserves already capitalized', () => {
      const { toPascalCase } = useFormatCollections()
      expect(toPascalCase('Posts')).toBe('Posts')
    })

    it('handles camelCase', () => {
      const { toPascalCase } = useFormatCollections()
      expect(toPascalCase('blogPosts')).toBe('BlogPosts')
    })

    it('handles empty string', () => {
      const { toPascalCase } = useFormatCollections()
      expect(toPascalCase('')).toBe('')
    })
  })
})

describe('useFormatCollections with empty config', () => {
  beforeEach(() => {
    // Reset mock to empty config
    mockAppConfig.croutonCollections = {}
  })

  it('returns original value when no layers configured', () => {
    const { stripLayerPrefix } = useFormatCollections()
    expect(stripLayerPrefix('blogPosts')).toBe('blogPosts')
  })

  it('still converts to title case', () => {
    const { collectionWithCapital } = useFormatCollections()
    expect(collectionWithCapital('blogPosts')).toBe('Blog Posts')
  })
})