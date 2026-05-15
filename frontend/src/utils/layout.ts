import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'

// 节点和边的默认尺寸
const nodeWidth = 200
const nodeHeight = 120
const rankSpacing = 150  // 层级间距（Y轴）
const nodeSpacing = 100  // 节点间距（X轴）

interface LayoutedElement {
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
