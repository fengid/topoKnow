import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Node,
  Edge,
  addEdge,
  Connection,
  MarkerType,
  ReactFlowInstance,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { treeApi, nodeApi } from '@/services/api'
import { useUIStore, useThemeStore } from '@/store'
import { useModelStore } from '@/store/modelStore'
import { useBatchGenSSE } from '@/features/tree/hooks/useBatchGenSSE'
import type { Node as NodeType } from '@/types'
import { getTreeLayout, getPartialTreeLayout } from '@/utils/treeLayout'
import { getRowsLayout } from '@/utils/rowsLayout'
import { nodeWidth, nodeHeight, type LayoutedElement } from '@/utils/layout'

export interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

const closedDialog: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  variant: 'info',
  onConfirm: () => {},
  onCancel: () => {},
}

/**
 * 树图画布核心逻辑：
 * - 数据加载 / 增删改 mutation
 * - 一致性可见性：任意时刻只显示 根路径 + 路径上每个节点的第一层子节点
 * - 展示模式：tree（dagre 树状）/ rows（按层分行靠左）
 * - 交互：单击展开/收起、双击进详情、侧键前进/后退
 */
export function useTreeCanvas(treeId?: string) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { setContextMenuNodeId, isBatchGenPanelOpen, setBatchGenPanelOpen } = useUIStore()
  const { resolvedTheme } = useThemeStore()
  const selectedModelId = useModelStore((s) => s.selectedModelId)

  // ---------- 状态 ----------
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [displayMode, setDisplayMode] = useState<'tree' | 'rows'>('rows')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(closedDialog)
  const [batchGenTarget, setBatchGenTarget] = useState<{ nodeId: string; topic: string } | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  const prevNodeIdsRef = useRef<Set<string>>(new Set())
  const batchGenRootRef = useRef<string | null>(null)
  // 单击延迟执行，避免与双击冲突
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 拖动手势抑制：一次手势只允许一次状态变更（dragStart 已处理，其后同手势的 click 不再切换）。
  // 用布尔 flag 绑定手势而非时间窗口：dragStop 即清除，不会误伤后续独立点击
  const dragHandledRef = useRef(false)
  const parentMapRef = useRef<Map<string, string>>(new Map())

  const closeDialog = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // ---------- 批量生成 ----------
  const {
    task: batchGenTask,
    items: batchGenItems,
    isConnected: batchGenConnected,
    start: batchGenStart,
    cancel: batchGenCancel,
    retry: batchGenRetry,
    error: batchGenError,
  } = useBatchGenSSE(treeId)

  // 任务开始时自动打开面板
  const autoOpenPanelRef = useRef<string | null>(null)
  useEffect(() => {
    if (batchGenTask && autoOpenPanelRef.current !== batchGenTask.id) {
      autoOpenPanelRef.current = batchGenTask.id
      if (!isBatchGenPanelOpen) setBatchGenPanelOpen(true)
    }
    if (!batchGenTask) autoOpenPanelRef.current = null
  }, [batchGenTask])

  // 批量生成期间的增量布局锚点 + 完成计数刷新
  const prevCompletedCountRef = useRef(0)
  useEffect(() => {
    if (!batchGenTask) {
      batchGenRootRef.current = null
      prevCompletedCountRef.current = 0
      return
    }
    if (batchGenTask.status === 'running' && batchGenRootRef.current == null) {
      batchGenRootRef.current = batchGenTask.root_node_id
    }
    if (batchGenTask.completed_items > prevCompletedCountRef.current) {
      prevCompletedCountRef.current = batchGenTask.completed_items
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] })
    }
    if (batchGenTask.status === 'completed' || batchGenTask.status === 'cancelled') {
      batchGenRootRef.current = null
    }
  }, [batchGenTask, treeId, queryClient])

  // ---------- 数据加载 ----------
  const { data: treeData, isLoading } = useQuery({
    queryKey: ['tree', treeId],
    queryFn: async () => {
      if (!treeId) throw new Error('No tree ID')
      const response = await treeApi.getById(treeId)
      return response.data.data
    },
    enabled: !!treeId,
  })

  // 兜底保护：树数据加载完成但没有根节点，跳转到首页
  useEffect(() => {
    if (treeData && !treeData.root_node) navigate('/')
  }, [treeData, navigate])

  // 切换树时重置状态
  useEffect(() => {
    setFocusNodeId(null)
    setSelectedNodeId(null)
  }, [treeId])

  // ---------- Mutations ----------
  const expandMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const response = await nodeApi.expand(nodeId, {
        topic: '',
        level: '',
        model: selectedModelId,
      })
      if (!response.data.success) {
        throw new Error(response.data.error || '展开失败')
      }
      return response.data.data as NodeType[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] })
    },
    onError: (error: Error) => {
      setConfirmDialog({
        isOpen: true,
        title: '展开失败',
        message: error.message,
        variant: 'warning',
        onConfirm: closeDialog,
        onCancel: closeDialog,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeApi.delete(nodeId)
      return nodeId
    },
    onSuccess: (deletedNodeId) => {
      if (treeData?.root_node?.id === deletedNodeId) {
        queryClient.invalidateQueries({ queryKey: ['trees'] })
        navigate('/')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] })
    },
  })

  const deleteChildrenMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeApi.deleteChildren(nodeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] })
    },
  })

  // ---------- 主题色 ----------
  const edgeColor = resolvedTheme === 'dark' ? 'rgba(201,169,110,0.6)' : 'rgba(201,169,110,0.5)'
  const canvasDot = resolvedTheme === 'dark' ? 'rgba(201,169,110,0.1)' : 'rgba(201,169,110,0.15)'

  // ---------- 可见性计算 + 布局 ----------
  useEffect(() => {
    if (!treeData?.root_node) {
      setNodes([])
      setEdges([])
      return
    }

    const allApiNodes = [treeData.root_node, ...(treeData.nodes || [])]

    // 父子关系映射（兄弟按 position_order 排序）
    const childrenByParent = new Map<string, NodeType[]>()
    const parentMap = new Map<string, string>()
    allApiNodes.forEach((node: NodeType) => {
      if (node.parent_id) {
        parentMap.set(node.id, node.parent_id)
        const existing = childrenByParent.get(node.parent_id) || []
        childrenByParent.set(node.parent_id, [...existing, node])
      }
    })
    childrenByParent.forEach((children, parentId) => {
      childrenByParent.set(
        parentId,
        children.sort((a, b) => (a.position_order ?? 0) - (b.position_order ?? 0))
      )
    })
    parentMapRef.current = parentMap

    // 根路径：从焦点沿 parent_id 回溯到根（无效焦点回落到根）
    const rootId = treeData.root_node.id
    const focusId = focusNodeId && parentMap.has(focusNodeId) ? focusNodeId : rootId
    const pathIds = new Set<string>()
    let cursor: string | undefined = focusId
    while (cursor) {
      pathIds.add(cursor)
      cursor = parentMap.get(cursor)
    }

    // 可见节点 = 根路径节点 + 路径上每个节点的直接子节点
    const visibleNodeIds = new Set(pathIds)
    pathIds.forEach((pid) => {
      ;(childrenByParent.get(pid) || []).forEach((child) => visibleNodeIds.add(child.id))
    })

    // 可见节点按 DFS 顺序排列（行式布局行内顺序依赖此顺序）
    const nodeById = new Map<string, NodeType>(allApiNodes.map((n) => [n.id, n]))
    const orderedApiNodes: NodeType[] = []
    const walk = (nodeId: string) => {
      const node = nodeById.get(nodeId)
      if (!node || !visibleNodeIds.has(nodeId)) return
      orderedApiNodes.push(node)
      ;(childrenByParent.get(nodeId) || []).forEach((child) => walk(child.id))
    }
    walk(rootId)

    const flowNodes: Node[] = orderedApiNodes.map((node: NodeType) => {
      const hasChildren = childrenByParent.has(node.id)
      return {
        id: node.id,
        type: 'custom' as const,
        position: { x: 0, y: 0 },
        data: {
          id: node.id,
          label: node.topic,
          depth: node.depth,
          description: node.description,
          difficulty: node.difficulty,
          importance: node.importance,
          hasChildren,
          isFocus: node.id === focusId,
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
                closeDialog()
              },
              onCancel: closeDialog,
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
                    closeDialog()
                  },
                  onCancel: closeDialog,
                })
              }
            : undefined,
          onEdit: () => setSelectedNodeId(node.id),
          onShowDetail: () => {
            setContextMenuNodeId(null)
            setSelectedNodeId(node.id)
          },
          onExpand: () => expandMutation.mutate(node.id),
          onBatchGen: () => setBatchGenTarget({ nodeId: node.id, topic: node.topic }),
        },
      }
    })

    // 只连接可见节点
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

    // 布局：按展示模式分派
    const prevIds = prevNodeIdsRef.current
    const currentIds = new Set(flowNodes.map((n) => n.id))
    const hasNewNodes = [...currentIds].some((nid) => !prevIds.has(nid))
    const batchRootId = batchGenRootRef.current

    let layouted: LayoutedElement
    if (displayMode === 'rows') {
      // 行式：按层分行，行内靠左对齐
      layouted = getRowsLayout(flowNodes, flowEdges)
    } else if (hasNewNodes && batchRootId && currentIds.has(batchRootId)) {
      // 树状-增量：批量生成时只重排子树，其余节点保持原位
      const renderedPositions = new Map(nodes.map((n) => [n.id, n.position]))
      const existingFlowNodes = flowNodes
        .filter((n) => prevIds.has(n.id))
        .map((n) => ({ ...n, position: renderedPositions.get(n.id) ?? n.position }))
      const newFlowNodes = flowNodes.filter((n) => !prevIds.has(n.id))
      layouted = getPartialTreeLayout(existingFlowNodes, newFlowNodes, flowEdges, batchRootId)
    } else {
      // 树状-全量
      layouted = getTreeLayout(flowNodes, flowEdges)
    }

    prevNodeIdsRef.current = currentIds
    setNodes(layouted.nodes)
    setEdges(layouted.edges)
    // 焦点变化后的布局已提交，标记待跟随——由下方消费 effect 在新坐标上执行 setCenter
    if (focusChangedRef.current) {
      focusChangedRef.current = false
      pendingFollowRef.current = focusNodeId
    }
  }, [treeData, focusNodeId, displayMode, setNodes, setEdges])

  // ---------- 焦点变化后跟随视图（保持缩放） ----------
  // 一致性：用户设置的缩放是最高优先级意图；展开/收起只平移到焦点节点，不重置缩放。
  // 适配视图（fitView）仅发生在首次挂载。
  // 实现：焦点变化只登记 pending（不设 timer，避免被重渲染 cleanup 清掉）；
  // 布局 effect 提交新坐标后，本 effect 在下一次 nodes 变化时消费 pending 并 setCenter，
  // 天然使用重布局后的新坐标。
  const pendingFollowRef = useRef<string | null>(null)
  const focusChangedRef = useRef(false)
  const prevFocusRef = useRef<string | null>(null)
  useEffect(() => {
    if (focusNodeId !== prevFocusRef.current) {
      focusChangedRef.current = true
      prevFocusRef.current = focusNodeId
    }
  }, [focusNodeId])

  useEffect(() => {
    const pending = pendingFollowRef.current
    if (!pending || !reactFlowInstance) return
    const focusNode = nodes.find((n) => n.id === pending)
    if (!focusNode) return
    pendingFollowRef.current = null
    const timer = setTimeout(() => {
      // 对准节点中心（布局坐标为左上角）
      reactFlowInstance.setCenter(
        focusNode.position.x + nodeWidth / 2,
        focusNode.position.y + nodeHeight / 2,
        {
          zoom: reactFlowInstance.getZoom(), // 保持当前缩放
          duration: 500,
        }
      )
    }, 60)
    return () => clearTimeout(timer)
  }, [nodes, reactFlowInstance])

  // ---------- 交互 ----------
  // 单击：延迟执行避免与双击冲突；已是焦点则收起（焦点回到父节点），否则展开
  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setContextMenuNodeId(null)
    // 同一手势已由 dragStart 处理过（微移点击会先触发拖动），跳过防双次触发
    if (dragHandledRef.current) return
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      setFocusNodeId((prev) =>
        prev === node.id ? (parentMapRef.current.get(node.id) ?? null) : node.id
      )
    }, 220)
  }, [])

  // 双击：进入详情（取消挂起的单击）
  const onNodeDoubleClick = useCallback((_: unknown, node: Node) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    setSelectedNodeId(node.id)
  }, [])

  // 拖动开始：切换焦点（拖动节点 = 关注该节点，与单击语义一致；
  // 焦点变化触发重布局，节点吸附回布局位置——布局由算法统一管理）
  // 拖动开始：标记手势已处理 + 登记待切换焦点。
  // 焦点切换延迟到 dragStop：手势中途重布局会让被拖节点瞬移、光标锚点断裂，
  // 布局只在手势结束后更新（一次手势一次状态变更，且变更时机在手势边界）
  const pendingDragFocusRef = useRef<string | null>(null)
  const onNodeDragStart = useCallback((_: unknown, node: Node) => {
    setContextMenuNodeId(null)
    // 标记本次手势已处理，随后同手势的 click 事件不再切换
    //（否则会判定为"再次点击"而收起到父节点）
    dragHandledRef.current = true
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    pendingDragFocusRef.current = node.id
  }, [])

  // 拖动结束：消费登记的焦点切换；延迟到事件循环末尾解除抑制——
  // dragStop 之后浏览器才会补发同手势的 click，必须让该 click 先经过抑制检查
  const onNodeDragStop = useCallback(() => {
    const pending = pendingDragFocusRef.current
    pendingDragFocusRef.current = null
    if (pending) {
      setFocusNodeId((prev) => (prev === pending ? prev : pending))
    }
    setTimeout(() => {
      dragHandledRef.current = false
    }, 0)
  }, [])

  const onPaneClick = useCallback(() => {
    setContextMenuNodeId(null)
    setSelectedNodeId(null)
  }, [])

  // 鼠标侧键（window 级监听，弹窗打开时也生效）：前进进入焦点详情
  // （后退键不在此处理：浏览器会在历史栈层面回退，由下方 popstate 守卫接管，保证一次只退出一层上下文）
  const focusRef = useRef<string | null>(null)
  const rootIdRef = useRef<string | null>(null)
  focusRef.current = focusNodeId
  rootIdRef.current = treeData?.root_node?.id ?? null
  useEffect(() => {
    const onAuxClick = (event: MouseEvent) => {
      if (event.button === 4) {
        const focusId = focusRef.current ?? rootIdRef.current
        if (focusId) setSelectedNodeId(focusId)
      }
    }
    window.addEventListener('auxclick', onAuxClick)
    return () => window.removeEventListener('auxclick', onAuxClick)
  }, [])

  // 历史栈守卫：后退键逐层退出上下文（详情 → 焦点 → 离开页面），而非直接回退 URL。
  // 依赖 treeId：切换树（如模式切换跳转）时重建哨兵，保证守卫始终对应当前页面；
  // 卸载时弹出哨兵，不留历史残留
  const selectedNodeIdRef = useRef<string | null>(null)
  const guardTreeIdRef = useRef<string | null>(null)
  selectedNodeIdRef.current = selectedNodeId
  useEffect(() => {
    const guardState = { __treeGuard: true }
    window.history.pushState(guardState, '')

    const onPopState = (event: PopStateEvent) => {
      // 前进键回到守卫层：忽略（前进行为由 auxclick 处理）
      if ((event.state as { __treeGuard?: boolean } | null)?.__treeGuard) return

      // 守卫条目对应的树已不是当前树（跨树导航后残留）：本次后退是真正的页面回退，
      // 再弹一层到目标页，避免 URL 与内容不一致
      if (guardTreeIdRef.current && guardTreeIdRef.current !== treeId) {
        window.history.back()
        return
      }

      if (selectedNodeIdRef.current) {
        // 第一层：退出详情
        setSelectedNodeId(null)
        window.history.pushState(guardState, '')
      } else if (focusRef.current && rootIdRef.current && focusRef.current !== rootIdRef.current) {
        // 第二层：收起焦点，回退到父节点
        setFocusNodeId(parentMapRef.current.get(focusRef.current) ?? null)
        window.history.pushState(guardState, '')
      } else {
        // 没有可退的上下文：执行真正的页面回退
        window.history.back()
      }
    }

    guardTreeIdRef.current = treeId ?? null
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      // 卸载时回收哨兵：若当前仍在哨兵层则弹回，避免历史栈残留导致后退多按一次
      if (window.history.state && (window.history.state as { __treeGuard?: boolean }).__treeGuard) {
        window.history.back()
      }
    }
  }, [treeId])

  // 卸载时清理定时器
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    }
  }, [])

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

  return {
    // 数据
    treeData,
    isLoading,
    // 画布
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setReactFlowInstance,
    edgeColor,
    canvasDot,
    // 展示模式
    displayMode,
    setDisplayMode,
    // 详情
    selectedNodeId,
    setSelectedNodeId,
    // 交互
    onNodeClick,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDragStop,
    onPaneClick,
    // 确认弹窗
    confirmDialog,
    closeDialog,
    // 批量生成
    batchGen: {
      task: batchGenTask,
      items: batchGenItems,
      isConnected: batchGenConnected,
      start: batchGenStart,
      cancel: batchGenCancel,
      retry: batchGenRetry,
      error: batchGenError,
      target: batchGenTarget,
      setTarget: setBatchGenTarget,
      isPanelOpen: isBatchGenPanelOpen,
      setPanelOpen: setBatchGenPanelOpen,
    },
  }
}
