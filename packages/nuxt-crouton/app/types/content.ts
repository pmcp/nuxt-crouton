/**
 * Types for content templates and utilities.
 */

export interface TocLink {
  id: string
  text: string
  depth: number
}

export type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'

export interface ContentTemplateProps {
  title?: string
  content?: string
  description?: string
  toc?: boolean | TocLink[]
  maxWidth?: MaxWidth
}

export interface Author {
  name: string
  avatar?: string
  description?: string
}

export interface ContentArticleProps extends ContentTemplateProps {
  author?: Author
  date?: Date | string
  image?: string
  imageAlt?: string
  tags?: string[]
  readingTime?: string
}
