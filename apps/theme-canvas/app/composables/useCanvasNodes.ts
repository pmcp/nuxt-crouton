import type { Node } from '@vue-flow/core'
import { COMPONENT_REGISTRY } from './useComponentRegistry'

export type ThemeName = 'default' | 'ko' | 'minimal' | 'kr11'
export type VariantName = 'solid' | 'soft' | 'ghost' | 'outline' | 'link' | ''

export interface ComponentNodeData {
  componentName: string
  theme: ThemeName
  baseVariant: VariantName
  props: Record<string, any>
  slots?: Record<string, string>
}

export type ComponentNode = Node<ComponentNodeData>

export const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'ko', label: 'KO' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'kr11', label: 'KR-11' }
]

export const VARIANTS: { value: VariantName; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'soft', label: 'Soft' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'outline', label: 'Outline' },
  { value: 'link', label: 'Link' }
]

export function useCanvasNodes() {
  const nodes = useState<ComponentNode[]>('canvas-nodes', () => [])
  let nodeIdCounter = 0

  function addNode(componentName: string, position?: { x: number; y: number }) {
    const config = COMPONENT_REGISTRY[componentName]
    if (!config) return

    const id = `node-${++nodeIdCounter}-${Date.now()}`
    const newNode: ComponentNode = {
      id,
      type: 'component',
      position: position || { x: 100 + (nodes.value.length * 50), y: 100 + (nodes.value.length * 50) },
      data: {
        componentName: config.name,
        theme: 'default',
        baseVariant: '',
        props: { ...config.defaultProps },
        slots: config.slots ? { ...config.slots } : undefined
      }
    }

    nodes.value = [...nodes.value, newNode]
    return id
  }

  function updateNodeData(nodeId: string, updates: Partial<ComponentNodeData>) {
    nodes.value = nodes.value.map((node): ComponentNode => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, ...updates } as ComponentNodeData
        }
      }
      return node
    })
  }

  function removeNode(nodeId: string) {
    nodes.value = nodes.value.filter(node => node.id !== nodeId)
  }

  function getComputedVariant(theme: ThemeName, baseVariant: VariantName): string | undefined {
    if (theme === 'default') {
      return baseVariant || undefined
    }
    if (baseVariant) {
      return `${theme}-${baseVariant}`
    }
    return theme
  }

  return {
    nodes,
    addNode,
    updateNodeData,
    removeNode,
    getComputedVariant
  }
}
