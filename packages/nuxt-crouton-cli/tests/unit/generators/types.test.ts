import { describe, it, expect } from 'vitest'
import { generateTypes } from '../../../lib/generators/types.mjs'
import {
  basicTypesData,
  minimalConfig,
  translationsConfig,
  noMetadataConfig
} from '../../fixtures/sample-data.mjs'

describe('generateTypes', () => {
  it('generates correct types for basic collection', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toMatchSnapshot()
  })

  it('includes AI context header', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain('@crouton-generated')
    expect(result).toContain('@collection products')
    expect(result).toContain('@layer shop')
  })

  it('generates correct interface name with layer prefix', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain('export interface ShopProduct {')
    expect(result).toContain('export type ShopProductFormData')
    expect(result).toContain('export type NewShopProduct')
    expect(result).toContain('export interface ShopProductFormProps')
  })

  it('includes team fields', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain('teamId: string')
    expect(result).toContain('owner: string')
  })

  it('includes metadata fields when enabled', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain('createdAt: Date')
    expect(result).toContain('updatedAt: Date')
    expect(result).toContain('createdBy: string')
    expect(result).toContain('updatedBy: string')
  })

  it('excludes metadata fields when disabled', () => {
    const result = generateTypes(basicTypesData, noMetadataConfig)
    expect(result).not.toContain('createdAt: Date')
    expect(result).not.toContain('updatedAt: Date')
  })

  it('includes optimistic update fields', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain('optimisticId?: string')
    expect(result).toContain("optimisticAction?: 'create' | 'update' | 'delete'")
  })

  it('generates correct import from composable', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain("import type { shopProductSchema } from './app/composables/useShopProducts'")
  })

  it('handles translations when configured', () => {
    const result = generateTypes(basicTypesData, translationsConfig)
    expect(result).toContain('translations?:')
    expect(result).toContain('locale?: string')
  })

  it('omits correct fields from New type', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain("Omit<ShopProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>")
  })

  it('generates correct FormProps interface', () => {
    const result = generateTypes(basicTypesData, minimalConfig)
    expect(result).toContain('items: string[]')
    expect(result).toContain('activeItem: ShopProduct | Record<string, never>')
    expect(result).toContain('collection: string')
    expect(result).toContain('loading: string')
    expect(result).toContain("action: 'create' | 'update' | 'delete'")
  })
})
