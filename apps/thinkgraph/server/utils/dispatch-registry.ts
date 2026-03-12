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

const registry = new Map<string, DispatchService>()

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
