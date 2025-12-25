export interface SlotItem {
  id: string
  label?: string
  value?: string
  translations?: {
    label?: Record<string, string>
  }
}

export interface LocationData {
  id: string
  teamId: string
  owner: string
  title: string
  color?: string | null
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
  date: Date | string
  slotId: string
  slotLabel: string
  slotColor?: string
  slotPosition?: number
  totalSlots?: number
  groupId?: string | null
  groupLabel?: string | null
  // Inventory mode
  isInventoryMode?: boolean
  quantity?: number
}

export interface SettingsData {
  id: string
  teamId: string
  enableGroups?: boolean
  groups?: Array<{ id: string; label: string }>
}

export interface BookingData {
  id: string
  teamId: string
  locationId: string
  date: string | Date
  slot: string
  status: string
  owner?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}
