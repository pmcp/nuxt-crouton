/**
 * Page Block Types
 *
 * Type definitions for the block-based page editor.
 * Blocks are stored as JSON in the content field and rendered
 * using Nuxt UI page components.
 */

// ============================================================================
// Base Types
// ============================================================================

export type BlockType =
  | 'heroBlock'
  | 'sectionBlock'
  | 'ctaBlock'
  | 'cardGridBlock'
  | 'separatorBlock'
  | 'richTextBlock'

export type Orientation = 'vertical' | 'horizontal'

export type ButtonColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'

export type ButtonVariant =
  | 'solid'
  | 'outline'
  | 'soft'
  | 'subtle'
  | 'ghost'
  | 'link'

export type CTAVariant =
  | 'outline'
  | 'solid'
  | 'soft'
  | 'subtle'
  | 'naked'

// ============================================================================
// Shared Sub-Types
// ============================================================================

export interface BlockLink {
  label: string
  to?: string
  color?: ButtonColor
  variant?: ButtonVariant
  icon?: string
  external?: boolean
}

export interface BlockFeature {
  title: string
  description?: string
  icon?: string
}

export interface BlockCard {
  title: string
  description?: string
  icon?: string
  to?: string
  highlight?: boolean
  highlightColor?: ButtonColor
}

// ============================================================================
// Block Attribute Types
// ============================================================================

export interface HeroBlockAttrs {
  headline?: string
  title: string
  description?: string
  orientation?: Orientation
  reverse?: boolean
  links?: BlockLink[]
  image?: string
}

export interface SectionBlockAttrs {
  headline?: string
  icon?: string
  title: string
  description?: string
  orientation?: Orientation
  reverse?: boolean
  links?: BlockLink[]
  features?: BlockFeature[]
}

export interface CTABlockAttrs {
  title: string
  description?: string
  orientation?: Orientation
  reverse?: boolean
  variant?: CTAVariant
  links?: BlockLink[]
}

export interface CardGridBlockAttrs {
  headline?: string
  title?: string
  description?: string
  columns?: 2 | 3 | 4
  cards: BlockCard[]
}

export interface SeparatorBlockAttrs {
  label?: string
  icon?: string
  type?: 'solid' | 'dashed' | 'dotted'
}

export interface RichTextBlockAttrs {
  content: string
}

// ============================================================================
// Block Type Union
// ============================================================================

export type BlockAttrs =
  | HeroBlockAttrs
  | SectionBlockAttrs
  | CTABlockAttrs
  | CardGridBlockAttrs
  | SeparatorBlockAttrs
  | RichTextBlockAttrs

// ============================================================================
// Block Node Types (TipTap format)
// ============================================================================

export interface PageBlock<T extends BlockAttrs = BlockAttrs> {
  type: BlockType
  attrs: T
}

export interface HeroBlock extends PageBlock<HeroBlockAttrs> {
  type: 'heroBlock'
}

export interface SectionBlock extends PageBlock<SectionBlockAttrs> {
  type: 'sectionBlock'
}

export interface CTABlock extends PageBlock<CTABlockAttrs> {
  type: 'ctaBlock'
}

export interface CardGridBlock extends PageBlock<CardGridBlockAttrs> {
  type: 'cardGridBlock'
}

export interface SeparatorBlock extends PageBlock<SeparatorBlockAttrs> {
  type: 'separatorBlock'
}

export interface RichTextBlock extends PageBlock<RichTextBlockAttrs> {
  type: 'richTextBlock'
}

// ============================================================================
// Document Type
// ============================================================================

export interface PageBlockContent {
  type: 'doc'
  content: PageBlock[]
}

// ============================================================================
// Block Registry Types
// ============================================================================

export interface BlockDefinition<T extends BlockAttrs = BlockAttrs> {
  type: BlockType
  name: string
  description: string
  icon: string
  category: 'hero' | 'content' | 'cta' | 'layout'
  defaultAttrs: T
  schema: BlockPropertySchema[]
}

export interface BlockPropertySchema {
  name: string
  type: 'text' | 'textarea' | 'select' | 'switch' | 'links' | 'features' | 'cards' | 'icon' | 'image'
  label: string
  description?: string
  required?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: unknown
}

// ============================================================================
// Editor Types
// ============================================================================

export interface BlockEditorState {
  selectedBlockId: string | null
  isPropertyPanelOpen: boolean
}

export interface BlockMenuItem {
  type: BlockType
  name: string
  description: string
  icon: string
  category: string
}

// ============================================================================
// Type Guards
// ============================================================================

export function isHeroBlock(block: PageBlock): block is HeroBlock {
  return block.type === 'heroBlock'
}

export function isSectionBlock(block: PageBlock): block is SectionBlock {
  return block.type === 'sectionBlock'
}

export function isCTABlock(block: PageBlock): block is CTABlock {
  return block.type === 'ctaBlock'
}

export function isCardGridBlock(block: PageBlock): block is CardGridBlock {
  return block.type === 'cardGridBlock'
}

export function isSeparatorBlock(block: PageBlock): block is SeparatorBlock {
  return block.type === 'separatorBlock'
}

export function isRichTextBlock(block: PageBlock): block is RichTextBlock {
  return block.type === 'richTextBlock'
}
