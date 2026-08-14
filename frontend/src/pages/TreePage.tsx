import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, { Background, MarkerType, NodeTypes } from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { NodeFullscreenModal } from '@/components/NodeFullscreenModal'
import { useModelStore } from '@/store/modelStore'
import Navbar from '@/components/Navbar'
import { CustomNode } from '@/features/tree/components'
import { BatchGenPanel, BatchGenStartDialog } from '@/features/tree/components/BatchGenPanel'
import { DisplayModeToggle } from '@/features/tree/components/DisplayModeToggle'
import { NoiseOverlay } from '@/components/shared'
import { useTreeCanvas } from '@/features/tree/hooks/useTreeCanvas'
import { ZoomIndicator } from '@/features/tree/components'
import { treeApi } from '@/services/api'
import { TREE_MODES, TreeModeToggle } from '@/features/tree/components'
import type { TreeMode } from '@/types'

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

export default function TreePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const selectedModelId = useModelStore((s) => s.selectedModelId)

  const {
    treeData,
    isLoading,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setReactFlowInstance,
    edgeColor,
    canvasDot,
    displayMode,
    setDisplayMode,
    selectedNodeId,
    setSelectedNodeId,
    onNodeClick,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDragStop,
    onPaneClick,
    confirmDialog,
    closeDialog,
    batchGen,
  } = useTreeCanvas(id)

  // 树的模式切换：切换 = 跳转到同主题另一模式的树；不存在时确认创建（模式是树的属性，不在树内切换）
  const [modeSwitchPending, setModeSwitchPending] = useState<TreeMode | null>(null)
  const [isCreatingTree, setIsCreatingTree] = useState(false)
  const [modeSwitchError, setModeSwitchError] = useState<string | null>(null)
  const currentMode: TreeMode = treeData?.mode === 'interview' ? 'interview' : 'understanding'

  const handleModeSwitch = async (target: TreeMode) => {
    if (target === currentMode || !treeData?.root_topic) return
    setModeSwitchError(null)
    // 查找同主题目标模式的树；查询失败报错而非诱导创建（避免在已有树时重复建树）
    try {
      const { data } = await treeApi.getAll()
      const trees = data.data ?? []
      const existing = trees.find(
        (t) =>
          t.root_topic.trim().toLowerCase() === treeData.root_topic!.trim().toLowerCase() &&
          (t.mode ?? 'understanding') === target
      )
      if (existing) {
        navigate(`/tree/${existing.id}`)
      } else {
        setModeSwitchPending(target)
      }
    } catch (err) {
      setModeSwitchError(err instanceof Error ? err.message : '查询树列表失败，请重试')
    }
  }

  const handleCreateAndSwitch = async () => {
    if (!modeSwitchPending || !treeData?.root_topic || isCreatingTree) return
    setIsCreatingTree(true)
    setModeSwitchError(null)
    try {
      const { data } = await treeApi.create(treeData.root_topic, modeSwitchPending)
      if (data.success && data.data) {
        setModeSwitchPending(null)
        navigate(`/tree/${data.data.id}`)
      } else {
        // 业务失败（如 AI 未配置）：留在弹窗内展示错误，不静默
        setModeSwitchError(data.error || data.message || '创建失败，请稍后重试')
      }
    } catch (err) {
      setModeSwitchError(err instanceof Error ? err.message : '创建失败，请稍后重试')
    } finally {
      setIsCreatingTree(false)
    }
  }

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
      <div className="flex-1 relative z-10">
        <DisplayModeToggle mode={displayMode} onChange={setDisplayMode} />

        {/* 树的模式切换（理解/面试）：当前树模式的属性展示 + 切换同主题另一模式的树 */}
        <div className="absolute top-16 left-4 z-[1000]">
          <TreeModeToggle mode={currentMode} onChange={handleModeSwitch} disabled={isCreatingTree} />
        </div>

        <BatchGenPanel
          task={batchGen.task}
          items={batchGen.items}
          isConnected={batchGen.isConnected}
          isPanelOpen={batchGen.isPanelOpen}
          error={batchGen.error}
          onToggle={() => batchGen.setPanelOpen(!batchGen.isPanelOpen)}
          onCancel={batchGen.cancel}
          onRetry={batchGen.retry}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          elementsSelectable={false}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ maxZoom: 1 }}
          attributionPosition="bottom-left"
          defaultEdgeOptions={{
            type: 'smoothstep',
            className: 'liquid-edge-animated',
            animated: true,
            style: { stroke: edgeColor, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${edgeColor}40)` },
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
          }}
        >
          <Background color={canvasDot} gap={24} size={1} />
          <ZoomIndicator />
        </ReactFlow>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => closeDialog()}
      />

      {/* 模式切换确认：目标模式的树不存在，确认后创建；创建期间防重复提交；失败展示错误 */}
      <ConfirmDialog
        isOpen={modeSwitchPending != null}
        title="创建新模式的学习树"
        message={`${
          modeSwitchError
            ? `${modeSwitchError}`
            : `「${treeData?.root_topic ?? ''}」还没有${
                TREE_MODES.find((m) => m.value === modeSwitchPending)?.label ?? ''
              }的树，是否以当前主题创建？（当前处于${
                TREE_MODES.find((m) => m.value === currentMode)?.label
              }）`
        }`}
        variant="info"
        onConfirm={handleCreateAndSwitch}
        onCancel={() => {
          if (!isCreatingTree) {
            setModeSwitchPending(null)
            setModeSwitchError(null)
          }
        }}
      />

      {/* Node Fullscreen Modal */}
      <NodeFullscreenModal
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
      />

      {/* Batch Gen Start Dialog */}
      <BatchGenStartDialog
        isOpen={batchGen.target != null}
        nodeTopic={batchGen.target?.topic ?? ''}
        onClose={() => batchGen.setTarget(null)}
        onStart={async (layers) => {
          if (!batchGen.target) return
          await batchGen.start(batchGen.target.nodeId, layers, selectedModelId ?? undefined)
          batchGen.setTarget(null)
          batchGen.setPanelOpen(true)
        }}
      />
    </div>
  )
}
