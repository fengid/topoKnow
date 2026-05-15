import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { treeApi, nodeApi } from '@/services/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { NodeFullscreenModal } from '@/components/NodeFullscreenModal'
import { useUIStore, useThemeStore } from '@/store'
import { useModelStore } from '@/store/modelStore'
import Navbar from '@/components/Navbar'
import { CustomNode } from '@/features/tree/components'
import { NoiseOverlay } from '@/components/shared'
import type { Node as NodeType } from '@/types'
import { getLayoutedElements } from '@/utils/layout'

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

export default function TreePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { setContextMenuNodeId } = useUIStore()
  const { resolvedTheme } = useThemeStore()
  const selectedModelId = useModelStore((s) => s.selectedModelId)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant?: 'danger' | 'warning' | 'info'
    onConfirm: () => void
    onCancel: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: () => {},
    onCancel: () => {},
  })

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['tree', id],
    queryFn: async () => {
      if (!id) throw new Error('No tree ID')
      const response = await treeApi.getById(id)
      return response.data.data
    },
    enabled: !!id,
  })

  const expandMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const response = await nodeApi.expand(nodeId, {
        topic: 'Go',
        level: 'intermediate',
        model: selectedModelId,
      })
      // 检测业务错误
      if (!response.data.success) {
        throw new Error(response.data.error || '展开失败')
      }
      return response.data.data as NodeType[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
    },
    onError: (error: Error) => {
      setConfirmDialog({
        isOpen: true,
        title: '展开失败',
        message: error.message,
        variant: 'warning',
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        onCancel: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeApi.delete(nodeId)
      return nodeId
    },
    onSuccess: (deletedNodeId) => {
      // 检查删除的是否是根节点
      if (treeData?.root_node?.id === deletedNodeId) {
        // 跳转到首页
        navigate('/')
        return
      }
      // 非根节点，正常刷新树数据
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
    },
  })

  const deleteChildrenMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeApi.deleteChildren(nodeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
    },
  })

  const toggleExpandMutation = useMutation({
    mutationFn: async ({ nodeId, isExpanded }: { nodeId: string; isExpanded: boolean }) => {
      await nodeApi.updateExpanded(nodeId, isExpanded)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
    },
  })

  // 使用金色主题的边和点
  const edgeColor = resolvedTheme === 'dark' ? 'rgba(201,169,110,0.6)' : 'rgba(201,169,110,0.5)'
  const canvasDot = resolvedTheme === 'dark' ? 'rgba(201,169,110,0.1)' : 'rgba(201,169,110,0.15)'

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      className: 'liquid-edge-animated',
      animated: true,
      style: { stroke: edgeColor, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${edgeColor}40)` },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor }
    }, eds)),
    [setEdges, edgeColor]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (typeof type === 'undefined' || !type) return
      if (!reactFlowInstance) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position,
        data: { label: type },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  // 兜底保护：如果树数据加载完成但没有根节点，跳转到首页
  useEffect(() => {
    if (treeData && !treeData.root_node) {
      navigate('/')
    }
  }, [treeData, navigate])

  // Transform API nodes to React Flow nodes
  useEffect(() => {
    if (!treeData?.root_node) {
      setNodes([])
      setEdges([])
      return
    }

    const childrenByParent = new Map<string, NodeType[]>()

    const allApiNodes = [treeData.root_node, ...(treeData.nodes || [])]

    allApiNodes.forEach((node: NodeType) => {
      if (node.parent_id) {
        const existing = childrenByParent.get(node.parent_id) || []
        childrenByParent.set(node.parent_id, [...existing, node])
      }
    })

    // 按 position_order 排序，确保兄弟节点顺序正确
    childrenByParent.forEach((children, parentId) => {
      childrenByParent.set(parentId, children.sort((a, b) => (a.position_order ?? 0) - (b.position_order ?? 0)))
    })

    // 收集所有节点的展开状态
    const expandedState = new Map<string, boolean>()
    allApiNodes.forEach((node: NodeType) => {
      // 默认为 true（展开状态）
      expandedState.set(node.id, node.is_expanded !== false)
    })

    // 构建可见节点列表（只包含展开的子节点）
    const visibleNodeIds = new Set<string>()

    // 首先添加根节点
    visibleNodeIds.add(treeData.root_node.id)

    // 递归添加展开的子节点
    const addVisibleChildren = (parentId: string) => {
      const isExpanded = expandedState.get(parentId) ?? true
      if (!isExpanded) return

      const children = childrenByParent.get(parentId) || []
      children.forEach((child) => {
        visibleNodeIds.add(child.id)
        addVisibleChildren(child.id)
      })
    }

    addVisibleChildren(treeData.root_node.id)

    // 只渲染可见节点
    const flowNodes: Node[] = allApiNodes
      .filter((node: NodeType) => visibleNodeIds.has(node.id))
      .map((node: NodeType) => {
        const hasChildren = childrenByParent.has(node.id)
        const isExpanded = expandedState.get(node.id) ?? true

        return {
          id: node.id,
          type: 'custom' as const,
          position: { x: 0, y: 0 },
          data: {
            id: node.id,
            label: node.topic,
            description: node.description,
            difficulty: node.difficulty,
            importance: node.importance,
            hasChildren: hasChildren,
            isExpanded: isExpanded,
            hasArticle: node.has_article ?? false,
            questionCount: node.question_count ?? 0,
            onDelete: () => {
              setConfirmDialog({
                isOpen: true,
                title: '删除节点',
                message: '确定要删除此节点及其所有子节点吗？此操作不可恢复。',
                variant: 'danger',
                onConfirm: () => {
                  deleteMutation.mutate(node.id)
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                },
                onCancel: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
              })
            },
            onDeleteChildren: hasChildren
              ? () => {
                  setConfirmDialog({
                    isOpen: true,
                    title: '删除所有子节点',
                    message: `确定要删除「${node.topic}」的所有子节点吗？关联的练习题和文章也会被删除，此操作不可恢复。`,
                    variant: 'danger',
                    onConfirm: () => {
                      deleteChildrenMutation.mutate(node.id)
                      setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                    },
                    onCancel: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
                  })
                }
              : undefined,
            onEdit: () => {
              setSelectedNodeId(node.id)
            },
            onShowDetail: async () => {
              setContextMenuNodeId(null) // 关闭右键菜单
              setSelectedNodeId(node.id)
            },
            onExpand: () => expandMutation.mutate(node.id),
            onToggleExpand: () => {
              toggleExpandMutation.mutate({
                nodeId: node.id,
                isExpanded: !isExpanded,
              })
            },
          },
        }
      })

    // 创建边（只连接可见节点）
    const flowEdges: Edge[] = Array.from(visibleNodeIds).flatMap((parentId) => {
      const children = childrenByParent.get(parentId) || []
      return children
        .filter((child) => visibleNodeIds.has(child.id))
        .map((child) => ({
          id: `e${parentId}-${child.id}`,
          source: parentId,
          target: child.id,
          type: 'smoothstep',
          className: 'liquid-edge-animated',
          animated: true,
          style: { stroke: edgeColor, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${edgeColor}40)` },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        }))
    })

    const layouted = getLayoutedElements(flowNodes, flowEdges)
    setNodes(layouted.nodes)
    setEdges(layouted.edges)
  }, [treeData, setNodes, setEdges])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--home-bg)' }}>
        {/* 噪点纹理 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.035 }}>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

        {/* 环境光晕 */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'var(--home-glow-ambient)' }}
        />

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 rounded-full relative z-10"
          style={{ borderColor: 'rgba(201,169,110,0.3)', borderTopColor: 'rgba(201,169,110,0.9)' }}
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--home-bg)' }}>
      <NoiseOverlay />
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px]"
          style={{ background: 'var(--home-glow-ambient)' }}
        />
        <div
          className="absolute bottom-[-30%] right-[-15%] w-[50vw] h-[50vw] rounded-full blur-[100px]"
          style={{ background: 'var(--home-glow-ambient2)' }}
        />
      </div>

      {/* Header - Obsidian Luxe Style */}
      <Navbar subtitle={treeData?.root_topic} />

      {/* React Flow Canvas */}
      <div className="flex-1 relative z-10" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          onNodeClick={async (_, node) => {
            setContextMenuNodeId(null) // 关闭右键菜单
            setSelectedNodeId(node.id)
          }}
          onPaneClick={() => {
            setContextMenuNodeId(null)
            setSelectedNodeId(null)
          }}
          fitView
          attributionPosition="bottom-left"
          defaultEdgeOptions={{
            type: 'smoothstep',
            className: 'liquid-edge-animated',
            animated: true,
            style: { stroke: edgeColor, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${edgeColor}40)` },
          }}
        >
          <Background color={canvasDot} gap={24} size={1} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Legend - Obsidian Luxe Style */}
      <div className="absolute bottom-5 right-5 z-[1000]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="p-5 rounded-2xl space-y-3"
          style={{
            background: resolvedTheme === 'dark'
              ? 'rgba(20, 20, 20, 0.85)'
              : 'rgba(250, 250, 248, 0.88)',
            border: '1px solid var(--home-card-border)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="font-playfair text-xs mb-4" style={{ color: 'var(--home-text)' }}>
            重要性图例
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-md"
              style={{
                borderLeft: '3px solid rgba(255,59,48,0.8)',
                background: resolvedTheme === 'dark' ? 'rgba(40, 40, 40, 0.8)' : 'rgba(240, 240, 238, 0.8)',
              }}
            />
            <span className="font-outfit text-xs" style={{ color: 'var(--home-text-sub)' }}>高重要性</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-md"
              style={{
                borderLeft: '3px solid rgba(255,149,0,0.8)',
                background: resolvedTheme === 'dark' ? 'rgba(40, 40, 40, 0.8)' : 'rgba(240, 240, 238, 0.8)',
              }}
            />
            <span className="font-outfit text-xs" style={{ color: 'var(--home-text-sub)' }}>中等</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-md"
              style={{
                borderLeft: '3px solid rgba(52,199,89,0.8)',
                background: resolvedTheme === 'dark' ? 'rgba(40, 40, 40, 0.8)' : 'rgba(240, 240, 238, 0.8)',
              }}
            />
            <span className="font-outfit text-xs" style={{ color: 'var(--home-text-sub)' }}>低</span>
          </div>
        </motion.div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Node Fullscreen Modal */}
      <NodeFullscreenModal
        nodeId={selectedNodeId}
        onClose={() => {
          setSelectedNodeId(null)
        }}
      />
    </div>
  )
}
