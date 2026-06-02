import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'

// 节点和边的默认尺寸
const nodeWidth = 200
const nodeHeight = 120
const rankSpacing = 150  // 层级间距（Y轴）
const nodeSpacing = 100  // 节点间距（X轴）

export interface LayoutedElement {
  nodes: Node[]
  edges: Edge[]
}

/**
 * 使用 dagre 算法对节点进行自动布局
 * @param nodes 节点数组
 * @param edges 边数组
 * @returns 布局后的节点和边
 */
export function getLayoutedElements(
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

  // 设置布局方向：TB = Top to Bottom（从上到下）
  dagreGraph.setGraph({
    rankdir: options?.rankdir || 'TB',
    ranksep: options?.ranksep || rankSpacing,
    nodesep: options?.nodesep || nodeSpacing,
  })

  // 将所有节点添加到 dagre 图中
  nodes.forEach((node) => {
    // 如果节点已有位置，尝试使用实际测量宽度（简化处理使用默认值）
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    })
  })

  // 将所有边添加到 dagre 图中
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // 执行布局
  dagre.layout(dagreGraph)

  // 根据布局结果更新节点位置
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)

    if (!nodeWithPosition) {
      return node
    }

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return {
    nodes: layoutedNodes,
    edges,
  }
}

/**
 * 增量布局：只对子树进行 dagre 布局，已有节点位置保持不变。
 * 找到子树根节点作为锚点，子树内的节点相对于锚点布局，然后合并回全局。
 */
export function getPartialLayout(
  existingNodes: Node[],
  newNodes: Node[],
  allEdges: Edge[],
  subtreeRootId: string
): LayoutedElement {
  const existingMap = new Map(existingNodes.map((n) => [n.id, n]))
  const newNodeIds = new Set(newNodes.map((n) => n.id))

  // 收集子树中所有节点（包括已有子节点和新节点）
  const childEdges = allEdges.filter((e) => e.source === subtreeRootId || newNodeIds.has(e.source))

  // 找到所有子树节点 id
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

  // 收集子树内的节点和边
  const subtreeNodes: Node[] = []
  const subtreeEdges: Edge[] = []

  for (const id of subtreeIds) {
    const node = existingMap.get(id) || newNodes.find((n) => n.id === id)
    if (node) subtreeNodes.push(node)
  }

  for (const edge of allEdges) {
    if (subtreeIds.has(edge.source) && subtreeIds.has(edge.target)) {
      subtreeEdges.push(edge)
    }
  }

  // 用 dagre 对子树布局
  const layouted = getLayoutedElements(subtreeNodes, subtreeEdges)

  // 找到子树根节点的当前全局位置作为锚点
  const rootNode = existingMap.get(subtreeRootId)
  const layoutedRoot = layouted.nodes.find((n) => n.id === subtreeRootId)
  const anchorX = rootNode?.position.x ?? 0
  const anchorY = rootNode?.position.y ?? 0
  const layoutedRootX = layoutedRoot?.position.x ?? 0
  const layoutedRootY = layoutedRoot?.position.y ?? 0
  const offsetX = anchorX - layoutedRootX
  const offsetY = anchorY - layoutedRootY

  // 合并：已有节点保持原位，子树节点用偏移后的位置
  const mergedMap = new Map<string, Node>()

  // 先放已有节点（排除子树内的）
  for (const node of existingNodes) {
    if (!subtreeIds.has(node.id)) {
      mergedMap.set(node.id, node)
    }
  }

  // 放子树节点（偏移后）
  for (const node of layouted.nodes) {
    mergedMap.set(node.id, {
      ...node,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      },
    })
  }

  return {
    nodes: Array.from(mergedMap.values()),
    edges: allEdges,
  }
}
