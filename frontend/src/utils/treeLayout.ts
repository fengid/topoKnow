import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'
import { nodeWidth, nodeHeight, type LayoutedElement } from './layout'

const rankSpacing = 150 // 层级间距（Y轴）
const nodeSpacing = 100 // 节点间距（X轴）

/**
 * 树状布局：使用 dagre 算法对节点自动布局（自上而下）
 */
export function getTreeLayout(
  nodes: Node[],
  edges: Edge[],
  options?: {
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL'
    ranksep?: number
    nodesep?: number
  }
): LayoutedElement {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  dagreGraph.setGraph({
    rankdir: options?.rankdir || 'TB',
    ranksep: options?.ranksep || rankSpacing,
    nodesep: options?.nodesep || nodeSpacing,
  })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    if (!nodeWithPosition) return node
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

/**
 * 增量布局：只对子树进行 dagre 布局，已有节点位置保持不变。
 * 找到子树根节点作为锚点，子树内的节点相对于锚点布局，然后合并回全局。
 */
export function getPartialTreeLayout(
  existingNodes: Node[],
  newNodes: Node[],
  allEdges: Edge[],
  subtreeRootId: string
): LayoutedElement {
  const existingMap = new Map(existingNodes.map((n) => [n.id, n]))
  const newNodeIds = new Set(newNodes.map((n) => n.id))

  const childEdges = allEdges.filter((e) => e.source === subtreeRootId || newNodeIds.has(e.source))

  // 收集子树中所有节点 id
  const subtreeIds = new Set<string>()
  const queue = [subtreeRootId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (subtreeIds.has(current)) continue
    subtreeIds.add(current)
    for (const edge of childEdges) {
      if (edge.source === current) {
        queue.push(edge.target)
      }
    }
  }

  const subtreeNodes: Node[] = []
  for (const id of subtreeIds) {
    const node = existingMap.get(id) || newNodes.find((n) => n.id === id)
    if (node) subtreeNodes.push(node)
  }

  const subtreeEdges = allEdges.filter(
    (e) => subtreeIds.has(e.source) && subtreeIds.has(e.target)
  )

  const layouted = getTreeLayout(subtreeNodes, subtreeEdges)

  // 以子树根节点当前全局位置为锚点，平移子树
  const rootNode = existingMap.get(subtreeRootId)
  const layoutedRoot = layouted.nodes.find((n) => n.id === subtreeRootId)
  const offsetX = (rootNode?.position.x ?? 0) - (layoutedRoot?.position.x ?? 0)
  const offsetY = (rootNode?.position.y ?? 0) - (layoutedRoot?.position.y ?? 0)

  const mergedMap = new Map<string, Node>()
  for (const node of existingNodes) {
    if (!subtreeIds.has(node.id)) mergedMap.set(node.id, node)
  }
  for (const node of layouted.nodes) {
    mergedMap.set(node.id, {
      ...node,
      position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
    })
  }

  return { nodes: Array.from(mergedMap.values()), edges: allEdges }
}
