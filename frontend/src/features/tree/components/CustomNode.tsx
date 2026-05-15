import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit3,
  Sparkles,
  Info,
  FileText,
} from 'lucide-react'
import { useUIStore } from '@/store'

// Helper function to truncate description
const truncateDescription = (text: string, maxLength: number = 10): { display: string; isTruncated: boolean } => {
  if (!text) return { display: '', isTruncated: false }
  if (text.length <= maxLength) return { display: text, isTruncated: false }
  return { display: text.slice(0, maxLength) + '...', isTruncated: true }
}

interface CustomNodeData {
  id: string
  label: string
  description?: string
  difficulty?: number
  importance?: string
  onExpand?: () => void
  onToggleExpand?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDeleteChildren?: () => void
  hasChildren?: boolean
  isExpanded?: boolean
  isLoading?: boolean
  onShowDetail?: () => void
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
  tooltipPosition?: { x: number; y: number } | null
  hasArticle?: boolean
  questionCount?: number
}

// Custom Node Component - iOS 26 Liquid Glass Style
export function CustomNode({
  data,
  selected,
}: {
  data: CustomNodeData
  selected: boolean
}) {
  const { contextMenuNodeId, setContextMenuNodeId } = useUIStore()
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; zoom: number } | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  // 动态更新 tooltip 位置和字体大小
  useEffect(() => {
    if (!showTooltip || !nodeRef.current) return

    const updateTooltip = () => {
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect()
        // 获取当前的缩放级别
        const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement
        const style = window.getComputedStyle(viewportElement)
        const transform = style.transform
        const matrix = new DOMMatrix(transform)
        const currentZoom = matrix.a || 1

        setTooltipPos({
          x: rect.right + 12,
          y: rect.top - 8,
          zoom: currentZoom
        })
      }
    }

    // 初始更新
    updateTooltip()

    // 使用 requestAnimationFrame 监听缩放变化
    let rafId: number
    const loop = () => {
      updateTooltip()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [showTooltip])

  const importanceClass = {
    high: 'liquid-node-high',
    medium: 'liquid-node-medium',
    low: 'liquid-node-low',
  }

  const difficultyStars = Array.from({ length: 5 }, (_, i) => i < (data.difficulty || 0))

  // Context Menu 位置状态
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number; zoom: number } | null>(null)

  // 计算 Context Menu 位置
  const updateContextMenuPos = useCallback(() => {
    if (!nodeRef.current) return
    const rect = nodeRef.current.getBoundingClientRect()
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement
    const style = window.getComputedStyle(viewportElement)
    const matrix = new DOMMatrix(style.transform)
    const currentZoom = matrix.a || 1
    setContextMenuPos({
      x: rect.right - 160 * currentZoom,
      y: rect.bottom + 8 * currentZoom,
      zoom: currentZoom,
    })
  }, [])

  // 打开时计算位置 + 监听拖动/缩放
  useEffect(() => {
    if (!contextMenuNodeId || contextMenuNodeId !== data.id) return

    updateContextMenuPos()

    // 使用 requestAnimationFrame 监听拖动和缩放
    let rafId: number
    const loop = () => {
      updateContextMenuPos()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [contextMenuNodeId, data.id, updateContextMenuPos])

  const { display: displayDesc, isTruncated } = truncateDescription(data.description || '', 10)

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isTruncated) {
      setShowTooltip(true)
    }
    data.onMouseEnter?.(e)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    setShowTooltip(false)
    data.onMouseLeave?.(e)
  }

  const tooltip = showTooltip && isTruncated && data.description ? (
    createPortal(
      <div
        className="liquid-node-tooltip"
        style={{
          position: 'fixed',
          left: tooltipPos?.x || 0,
          top: tooltipPos?.y || 0,
          fontSize: `${12 * (tooltipPos?.zoom || 1)}px`,
        }}
      >
        <p className="leading-relaxed" style={{ fontSize: 'inherit' }}>{data.description}</p>
      </div>,
      document.body
    )
  ) : null

  return (
    <div className="relative" ref={nodeRef}>
      {/* Input Handle - Liquid Glass Style */}
      <Handle
        type="target"
        position={Position.Top}
        className="liquid-handle !w-2.5 !h-2.5 !border-2"
      />

      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`
          liquid-node
          ${selected ? 'liquid-node-selected' : ''}
          ${importanceClass[data.importance as keyof typeof importanceClass] || ''}
          ${data.isLoading ? 'liquid-node-loading' : ''}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenuNodeId(contextMenuNodeId === data.id ? null : data.id)
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="liquid-node-title truncate">{data.label}</h3>
            {data.description && (
              <div
                className="relative"
                onMouseEnter={() => isTruncated && setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <p className="liquid-node-description truncate">{displayDesc}</p>
              </div>
            )}
          </div>
          {data.hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                data.onToggleExpand?.()
              }}
              className="liquid-node-expand-btn"
            >
              {data.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Difficulty & badges */}
        <div className="liquid-node-footer">
          <div className="liquid-node-difficulty">
            {difficultyStars.map((filled, i) => (
              <span
                key={i}
                className={filled ? 'liquid-node-difficulty-star' : 'liquid-node-difficulty-star liquid-node-difficulty-star-empty'}
              >
                ★
              </span>
            ))}
          </div>

          {/* 徽章区域 */}
          <div className="flex items-center gap-1.5">
            {data.hasArticle && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="node-badge node-badge-article"
                title="已有文章"
              >
                <FileText className="w-3 h-3" />
              </motion.div>
            )}
            {data.questionCount !== undefined && data.questionCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.05 }}
                className="node-badge node-badge-question"
                title={`${data.questionCount} 道题目`}
              >
                Q {data.questionCount}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Context Menu - 使用 createPortal 渲染到 body */}
      {contextMenuNodeId === data.id && contextMenuPos && createPortal(
        <div
          style={{
            position: 'fixed',
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            transform: `scale(${contextMenuPos.zoom})`,
            transformOrigin: 'top left',
            zIndex: 99999,
          }}
        >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="liquid-node-context-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                data.onShowDetail?.()
                setContextMenuNodeId(null)
              }}
              className="liquid-node-context-menu-item"
            >
              <Info className="w-4 h-4" style={{ color: 'var(--home-text-sub)' }} />
              详情
            </button>
            <button
              onClick={() => {
                data.onEdit?.()
                setContextMenuNodeId(null)
              }}
              className="liquid-node-context-menu-item"
            >
              <Edit3 className="w-4 h-4" style={{ color: 'var(--home-text-sub)' }} />
              编辑
            </button>
            <button
              onClick={() => {
                data.onExpand?.()
                setContextMenuNodeId(null)
              }}
              className="liquid-node-context-menu-item"
            >
              <Sparkles className="w-4 h-4" style={{ color: 'rgba(201,169,110,0.7)' }} />
              AI 展开
            </button>
            <div className="liquid-node-context-menu-divider" />
            {data.onDeleteChildren && (
              <button
                onClick={() => {
                  data.onDeleteChildren?.()
                  setContextMenuNodeId(null)
                }}
                className="liquid-node-context-menu-item liquid-node-context-menu-item-danger"
              >
                <Trash2 className="w-4 h-4" />
                删除子树
              </button>
            )}
            <button
              onClick={() => {
                data.onDelete?.()
                setContextMenuNodeId(null)
              }}
              className="liquid-node-context-menu-item liquid-node-context-menu-item-danger"
            >
              <Trash2 className="w-4 h-4" />
              删除节点
            </button>
          </motion.div>
        </AnimatePresence>
        </div>,
        document.body
      )}

      {/* Output Handle - Liquid Glass Style */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="liquid-handle !w-2.5 !h-2.5 !border-2"
      />
      {tooltip}
    </div>
  )
}
