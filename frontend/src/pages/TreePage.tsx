import { useParams } from 'react-router-dom'
import ReactFlow, { Controls, Background, MarkerType, NodeTypes } from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { NodeFullscreenModal } from '@/components/NodeFullscreenModal'
import { useModelStore } from '@/store/modelStore'
import Navbar from '@/components/Navbar'
import { CustomNode } from '@/features/tree/components'
import { BatchGenPanel, BatchGenStartDialog } from '@/features/tree/components/BatchGenPanel'
import { DisplayModeToggle } from '@/features/tree/components/DisplayModeToggle'
import { ImportanceLegend } from '@/features/tree/components/ImportanceLegend'
import { NoiseOverlay } from '@/components/shared'
import { useTreeCanvas } from '@/features/tree/hooks/useTreeCanvas'

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

export default function TreePage() {
  const { id } = useParams<{ id: string }>()
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
    onPaneClick,
    confirmDialog,
    closeDialog,
    batchGen,
  } = useTreeCanvas(id)

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

        <BatchGenPanel
          task={batchGen.task}
          items={batchGen.items}
          isConnected={batchGen.isConnected}
          isPanelOpen={batchGen.isPanelOpen}
          error={batchGen.error}
          onClose={() => batchGen.setPanelOpen(false)}
          onCancel={batchGen.cancel}
          onRetry={batchGen.retry}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          fitView
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
          <Controls />
        </ReactFlow>
      </div>

      <ImportanceLegend />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => closeDialog()}
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
