import type { H3Event } from 'h3'
import type { Artifact } from '../../layers/thinkgraph/collections/decisions/types'

export interface DispatchContext {
  nodeContent: string
  thinkingPath: string
  prompt?: string
  options?: Record<string, unknown>
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
    import('./dispatch-services/dalle3'),
    import('./dispatch-services/flux'),
    import('./dispatch-services/lovable'),
    import('./dispatch-services/v0'),
    import('./dispatch-services/code'),
    import('./dispatch-services/text'),
    import('./dispatch-services/mermaid'),
    import('./dispatch-services/gemini'),
    import('./dispatch-services/business-canvas'),
    import('./dispatch-services/user-stories'),
    import('./dispatch-services/pitch'),
    import('./dispatch-services/swot'),
    import('./dispatch-services/technical-spec'),
    import('./dispatch-services/ui-prototype'),
    import('./dispatch-services/research-agent'),
    import('./dispatch-services/excalidraw'),
  ])
  _loaded = true
}
