import type { Node } from '@vue-flow/core'
import { COMPONENT_REGISTRY, CATEGORIES, type ComponentConfig } from './useComponentRegistry'

// Standard Nuxt UI variant names (theme mapping happens via updateAppConfig)
// 'none' is used internally for "no variant" - converted to undefined when applied
export type VariantName = 'none' | 'solid' | 'soft' | 'ghost' | 'outline' | 'link'

export interface ComponentNodeData {
  componentName: string
  variant: VariantName
  props: Record<string, any>
  slots?: Record<string, string>
}

export type ComponentNode = Node<ComponentNodeData>

export const VARIANTS: { value: VariantName; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'soft', label: 'Soft' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'outline', label: 'Outline' },
  { value: 'link', label: 'Link' }
]

// Layout configuration for auto-populate
const LAYOUT = {
  nodeWidth: 280,
  nodeHeight: 160,
  nodeGapX: 40,
  nodeGapY: 40,
  groupGapY: 100,
  groupLabelHeight: 50,
  columnsPerGroup: 4,
  startX: 100,
  startY: 100
}

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
        variant: 'none',
        props: { ...config.defaultProps },
        slots: config.slots ? { ...config.slots } : undefined
      }
    }

    nodes.value = [...nodes.value, newNode]
    return id
  }

  function populateAllComponents() {
    // Clear existing nodes
    nodes.value = []
    nodeIdCounter = 0

    const newNodes: ComponentNode[] = []
    let currentY = LAYOUT.startY

    // Group components by category
    const componentsByCategory: Record<string, ComponentConfig[]> = {}
    for (const config of Object.values(COMPONENT_REGISTRY)) {
      const category = config.category
      if (!componentsByCategory[category]) {
        componentsByCategory[category] = []
      }
      componentsByCategory[category]!.push(config)
    }

    // Create nodes for each category
    for (const category of CATEGORIES) {
      const components = componentsByCategory[category.key] || []
      if (components.length === 0) continue

      // Add group label node
      const labelId = `label-${category.key}-${Date.now()}`
      newNodes.push({
        id: labelId,
        type: 'group-label',
        position: { x: LAYOUT.startX, y: currentY },
        data: {
          componentName: '',
          variant: 'none',
          props: { label: category.label, count: components.length },
          slots: undefined
        }
      })

      currentY += LAYOUT.groupLabelHeight

      // Add component nodes in a grid
      components.forEach((config, index) => {
        const col = index % LAYOUT.columnsPerGroup
        const row = Math.floor(index / LAYOUT.columnsPerGroup)

        const x = LAYOUT.startX + col * (LAYOUT.nodeWidth + LAYOUT.nodeGapX)
        const y = currentY + row * (LAYOUT.nodeHeight + LAYOUT.nodeGapY)

        const id = `node-${++nodeIdCounter}-${Date.now()}-${index}`
        newNodes.push({
          id,
          type: 'component',
          position: { x, y },
          data: {
            componentName: config.name,
            variant: 'none',
            props: { ...config.defaultProps },
            slots: config.slots ? { ...config.slots } : undefined
          }
        })
      })

      // Calculate height of this group
      const rows = Math.ceil(components.length / LAYOUT.columnsPerGroup)
      currentY += rows * (LAYOUT.nodeHeight + LAYOUT.nodeGapY) + LAYOUT.groupGapY
    }

    nodes.value = newNodes
  }

  function clearCanvas() {
    nodes.value = []
    nodeIdCounter = 0
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

  return {
    nodes,
    addNode,
    updateNodeData,
    removeNode,
    populateAllComponents,
    clearCanvas
  }
}
