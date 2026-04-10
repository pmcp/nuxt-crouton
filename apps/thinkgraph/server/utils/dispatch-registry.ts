import type { H3Event } from 'h3'
import type { Artifact } from '../../layers/thinkgraph/collections/nodes/types'

export interface DispatchContext {
  nodeContent: string
  thinkingPath: string
  prompt?: string
  options?: Record<string, unknown>
  /** Internal metadata passed by the dispatch endpoint — team, graph, node details */
  _meta?: {
    teamSlug: string
    teamId: string
    graphId: string
    decisionId: string
    allDecisions: any[]
  }
}

export interface DispatchResult {
  artifacts: Artifact[]
  childContent: string
  childNodeType: string
}

export interface DispatchService {
  id: string
  name: string
  description: string
  type: 'image' | 'code' | 'prototype' | 'text'
  icon: string
  envKeys?: string[]
  options?: Array<{
    key: string
    label: string
    type: 'select' | 'text'
    choices?: string[]
    default?: string
  }>
  execute: (context: DispatchContext, event: H3Event) => Promise<DispatchResult>
}

// Use globalThis to survive Nitro HMR in dev mode
const REGISTRY_KEY = '__thinkgraph_dispatch_registry__'
if (!(globalThis as any)[REGISTRY_KEY]) {
  (globalThis as any)[REGISTRY_KEY] = new Map<string, DispatchService>()
}
const registry: Map<string, DispatchService> = (globalThis as any)[REGISTRY_KEY]

export function registerDispatchService(service: DispatchService) {
  registry.set(service.id, service)
}

export function getDispatchService(id: string): DispatchService | undefined {
  return registry.get(id)
}

export function getAllDispatchServices(): DispatchService[] {
  return Array.from(registry.values())
}

export function isServiceAvailable(service: DispatchService, event: H3Event): boolean {
  if (!service.envKeys || service.envKeys.length === 0) return true
  const config = useRuntimeConfig(event)
  return service.envKeys.every(key => !!(config as any)[key])
}

let _loaded = false

export async function ensureServicesLoaded() {
  if (_loaded && registry.size > 0) return
  _loaded = false
  // Import all service files — each calls registerDispatchService() at top level
  await Promise.all([
    import('./dispatch-services/pi-agent'),
  ])
  _loaded = true
}
