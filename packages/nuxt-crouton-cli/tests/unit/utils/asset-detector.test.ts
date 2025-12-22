import { describe, it, expect } from 'vitest'
import {
  isAssetSchema,
  referencesAssets,
  getAssetType,
  getAssetComponent
} from '../../../lib/utils/asset-detector.mjs'

describe('isAssetSchema', () => {
  it('returns true for schema with filename and pathname', () => {
    const schema = {
      id: { type: 'string' },
      filename: { type: 'string' },
      pathname: { type: 'string' }
    }

    expect(isAssetSchema(schema)).toBe(true)
  })

  it('returns true for schema with filename, pathname, and contentType', () => {
    const schema = {
      id: { type: 'string' },
      filename: { type: 'string' },
      pathname: { type: 'string' },
      contentType: { type: 'string' }
    }

    expect(isAssetSchema(schema)).toBe(true)
  })

  it('returns false for schema missing filename', () => {
    const schema = {
      id: { type: 'string' },
      pathname: { type: 'string' }
    }

    expect(isAssetSchema(schema)).toBe(false)
  })

  it('returns false for schema missing pathname', () => {
    const schema = {
      id: { type: 'string' },
      filename: { type: 'string' }
    }

    expect(isAssetSchema(schema)).toBe(false)
  })

  it('returns false for null schema', () => {
    expect(isAssetSchema(null)).toBe(false)
  })

  it('returns false for undefined schema', () => {
    expect(isAssetSchema(undefined)).toBe(false)
  })

  it('returns false for non-object schema', () => {
    expect(isAssetSchema('string')).toBe(false)
    expect(isAssetSchema(123)).toBe(false)
    expect(isAssetSchema([])).toBe(false)
  })

  it('returns false for empty object', () => {
    expect(isAssetSchema({})).toBe(false)
  })

  it('returns false for regular data schema', () => {
    const schema = {
      id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'text' },
      price: { type: 'decimal' }
    }

    expect(isAssetSchema(schema)).toBe(false)
  })

  it('returns true regardless of additional fields', () => {
    const schema = {
      id: { type: 'string' },
      filename: { type: 'string' },
      pathname: { type: 'string' },
      alt: { type: 'string' },
      width: { type: 'number' },
      height: { type: 'number' },
      caption: { type: 'string' }
    }

    expect(isAssetSchema(schema)).toBe(true)
  })
})

describe('referencesAssets', () => {
  describe('asset refTarget variations', () => {
    it('returns true for "assets" refTarget', () => {
      expect(referencesAssets({}, 'assets')).toBe(true)
    })

    it('returns true for "asset" refTarget', () => {
      expect(referencesAssets({}, 'asset')).toBe(true)
    })

    it('returns true for "blogAssets" refTarget', () => {
      expect(referencesAssets({}, 'blogAssets')).toBe(true)
    })

    it('returns true for "shopAssets" refTarget', () => {
      expect(referencesAssets({}, 'shopAssets')).toBe(true)
    })
  })

  describe('file refTarget variations', () => {
    it('returns true for "files" refTarget', () => {
      expect(referencesAssets({}, 'files')).toBe(true)
    })

    it('returns true for "file" refTarget', () => {
      expect(referencesAssets({}, 'file')).toBe(true)
    })

    it('returns true for "uploadedFiles" refTarget', () => {
      expect(referencesAssets({}, 'uploadedFiles')).toBe(true)
    })
  })

  describe('image refTarget variations', () => {
    it('returns true for "images" refTarget', () => {
      expect(referencesAssets({}, 'images')).toBe(true)
    })

    it('returns true for "image" refTarget', () => {
      expect(referencesAssets({}, 'image')).toBe(true)
    })

    it('returns true for "productImages" refTarget', () => {
      expect(referencesAssets({}, 'productImages')).toBe(true)
    })
  })

  describe('media refTarget variations', () => {
    it('returns true for "media" refTarget', () => {
      expect(referencesAssets({}, 'media')).toBe(true)
    })

    it('returns true for "mediaFiles" refTarget', () => {
      expect(referencesAssets({}, 'mediaFiles')).toBe(true)
    })

    it('returns true for "productMedia" refTarget', () => {
      expect(referencesAssets({}, 'productMedia')).toBe(true)
    })
  })

  describe('non-asset refTarget variations', () => {
    it('returns false for "categories" refTarget', () => {
      expect(referencesAssets({}, 'categories')).toBe(false)
    })

    it('returns false for "users" refTarget', () => {
      expect(referencesAssets({}, 'users')).toBe(false)
    })

    it('returns false for "posts" refTarget', () => {
      expect(referencesAssets({}, 'posts')).toBe(false)
    })

    it('returns false for "products" refTarget', () => {
      expect(referencesAssets({}, 'products')).toBe(false)
    })
  })

  describe('null and undefined handling', () => {
    it('returns false for null field', () => {
      expect(referencesAssets(null, 'assets')).toBe(false)
    })

    it('returns false for null refTarget', () => {
      expect(referencesAssets({}, null)).toBe(false)
    })

    it('returns false for undefined field', () => {
      expect(referencesAssets(undefined, 'assets')).toBe(false)
    })

    it('returns false for undefined refTarget', () => {
      expect(referencesAssets({}, undefined)).toBe(false)
    })

    it('returns false for empty string refTarget', () => {
      expect(referencesAssets({}, '')).toBe(false)
    })
  })

  describe('case insensitive matching', () => {
    it('returns true for "ASSETS" (uppercase)', () => {
      expect(referencesAssets({}, 'ASSETS')).toBe(true)
    })

    it('returns true for "Images" (mixed case)', () => {
      expect(referencesAssets({}, 'Images')).toBe(true)
    })

    it('returns true for "MEDIA_FILES" (uppercase)', () => {
      expect(referencesAssets({}, 'MEDIA_FILES')).toBe(true)
    })
  })
})

describe('getAssetType', () => {
  describe('image detection', () => {
    it('returns "image" for schema with alt field', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        alt: { type: 'string' }
      }

      expect(getAssetType(schema)).toBe('image')
    })

    it('returns "image" for schema with width field', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        width: { type: 'number' }
      }

      expect(getAssetType(schema)).toBe('image')
    })

    it('returns "image" for schema with height field', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        height: { type: 'number' }
      }

      expect(getAssetType(schema)).toBe('image')
    })

    it('returns "image" for schema with width and height', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' }
      }

      expect(getAssetType(schema)).toBe('image')
    })

    it('returns "image" for contentType pattern containing "image"', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        contentType: {
          type: 'string',
          meta: { pattern: 'image/*' }
        }
      }

      expect(getAssetType(schema)).toBe('image')
    })
  })

  describe('video detection', () => {
    it('returns "video" for contentType pattern containing "video"', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        contentType: {
          type: 'string',
          meta: { pattern: 'video/*' }
        }
      }

      expect(getAssetType(schema)).toBe('video')
    })
  })

  describe('audio detection', () => {
    it('returns "audio" for contentType pattern containing "audio"', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        contentType: {
          type: 'string',
          meta: { pattern: 'audio/*' }
        }
      }

      expect(getAssetType(schema)).toBe('audio')
    })
  })

  describe('general type', () => {
    it('returns "general" for basic asset schema', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' }
      }

      expect(getAssetType(schema)).toBe('general')
    })

    it('returns "general" for asset schema with contentType but no pattern', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        contentType: { type: 'string' }
      }

      expect(getAssetType(schema)).toBe('general')
    })

    it('returns "general" for asset schema with unrecognized contentType pattern', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        contentType: {
          type: 'string',
          meta: { pattern: 'application/*' }
        }
      }

      expect(getAssetType(schema)).toBe('general')
    })
  })

  describe('non-asset schemas', () => {
    it('returns null for non-asset schema', () => {
      const schema = {
        id: { type: 'string' },
        title: { type: 'string' }
      }

      expect(getAssetType(schema)).toBe(null)
    })

    it('returns null for null schema', () => {
      expect(getAssetType(null)).toBe(null)
    })

    it('returns null for undefined schema', () => {
      expect(getAssetType(undefined)).toBe(null)
    })
  })

  describe('priority handling', () => {
    it('prioritizes image fields over contentType pattern', () => {
      const schema = {
        filename: { type: 'string' },
        pathname: { type: 'string' },
        alt: { type: 'string' },
        contentType: {
          type: 'string',
          meta: { pattern: 'video/*' }
        }
      }

      // alt field is checked before contentType pattern
      expect(getAssetType(schema)).toBe('image')
    })
  })
})

describe('getAssetComponent', () => {
  it('returns CroutonAssetsPicker for "image" type', () => {
    expect(getAssetComponent('image')).toBe('CroutonAssetsPicker')
  })

  it('returns CroutonAssetsPicker for "video" type', () => {
    expect(getAssetComponent('video')).toBe('CroutonAssetsPicker')
  })

  it('returns CroutonAssetsPicker for "audio" type', () => {
    expect(getAssetComponent('audio')).toBe('CroutonAssetsPicker')
  })

  it('returns CroutonAssetsPicker for "general" type', () => {
    expect(getAssetComponent('general')).toBe('CroutonAssetsPicker')
  })

  it('returns CroutonAssetsPicker for undefined type (default)', () => {
    expect(getAssetComponent()).toBe('CroutonAssetsPicker')
  })

  it('returns CroutonAssetsPicker for null type', () => {
    expect(getAssetComponent(null as any)).toBe('CroutonAssetsPicker')
  })

  it('returns CroutonAssetsPicker for unknown type', () => {
    expect(getAssetComponent('unknown')).toBe('CroutonAssetsPicker')
  })
})
