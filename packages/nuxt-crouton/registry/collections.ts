// Auto-generated collection registry
// This file is maintained by the scaffolder - do not edit manually

export const collectionRegistry = {
  translationsUi: () => import('#imports').then(m => m.useTranslationsUi),
  teamTranslations: () => import('#imports').then(m => m.useTeamTranslations),
  posSystemLogs: () => import('#imports').then(m => m.usePosSystemLogs),
  posProducts: () => import('#imports').then(m => m.usePosProducts),
  posPrintQueues: () => import('#imports').then(m => m.usePosPrintQueues),
  posPrinters: () => import('#imports').then(m => m.usePosPrinters),
  posPrinterLocations: () => import('#imports').then(m => m.usePosPrinterLocations),
  posOrders: () => import('#imports').then(m => m.usePosOrders),
  posOrderProducts: () => import('#imports').then(m => m.usePosOrderProducts),
  posLocations: () => import('#imports').then(m => m.usePosLocations),
  posEvents: () => import('#imports').then(m => m.usePosEvents),
  posClients: () => import('#imports').then(m => m.usePosClients),
  posCategories: () => import('#imports').then(m => m.usePosCategories),
  fignoAgents: () => import('#imports').then(m => m.useFignoAgents),
} as const

export type CollectionName = keyof typeof collectionRegistry