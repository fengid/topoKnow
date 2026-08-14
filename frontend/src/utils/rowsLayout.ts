import type { Node, Edge } from 'reactflow'
import { nodeWidth, nodeHeight, type LayoutedElement } from './layout'

const rowGap = 60
const colGap = 40

/**
 * 行式布局：按 depth 分行，行内按传入顺序靠左排列（要求 nodes 为 DFS 顺序）
 */
export function getRowsLayout(nodes: Node[], edges: Edge[]): LayoutedElement {
  const rows = new Map<number, Node[]>()
  nodes.forEach((node) => {
    const depth = (node.data?.depth as number) ?? 0
    const row = rows.get(depth) || []
    row.push(node)
    rows.set(depth, row)
  })

  const positionById = new Map<string, { x: number; y: number }>()
  let y = 0
  Array.from(rows.keys())
    .sort((a, b) => a - b)
    .forEach((depth) => {
      let x = 0
      rows.get(depth)!.forEach((node) => {
        positionById.set(node.id, { x, y })
        x += nodeWidth + colGap
      })
      y += nodeHeight + rowGap
    })

  return {
    nodes: nodes.map((node) => ({ ...node, position: positionById.get(node.id) ?? node.position })),
    edges,
  }
}
