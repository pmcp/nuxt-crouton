export interface SlotItem {
  id: string
  label?: string
  value?: string
  color?: string
}

export interface LocationData {
  id: string
  teamId: string
  owner: string
  title: string
  street?: string | null
  zip?: string | null
  city?: string | null
  location?: string | null
  content?: string | null
  allowedMemberIds?: string | string[] | null
  slots?: SlotItem[] | string | null
  // Inventory mode fields
  inventoryMode?: boolean
  quantity?: number
  createdAt?: string | Date
  updatedAt?: string | Date
  createdBy?: string
  updatedBy?: string
}

export interface CartItem {
  id: string
  locationId: string
  locationTitle: string
  date: string // ISO string for localStorage
  slotId: string
  slotLabel: string
  slotColor?: string
  totalSlots?: number
  slotPosition?: number
  groupId?: string | null
  groupLabel?: string | null
  // Inventory mode
  isInventoryMode?: boolean
}

export interface BookingData {
  id: string
  date: string | Date
  status: string
  location?: string
  slot?: string | string[]
  group?: string
}

export interface SettingsData {
  enableGroups?: boolean
  groups?: Array<{ id: string; label: string }>
  statuses?: Array<{ id: string; label: string }>
}
