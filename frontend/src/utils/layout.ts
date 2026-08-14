import type { Node, Edge } from 'reactflow'

export interface LayoutedElement {
  nodes: Node[]
  edges: Edge[]
}

// 节点默认尺寸（两种布局共用）
export const nodeWidth = 200
export const nodeHeight = 120
