export interface CardProps {
  item: any
  layout: 'list' | 'grid' | 'cards'
  collection: string
  pending?: boolean
  error?: any
}

export type CardLayout = 'list' | 'grid' | 'cards'
