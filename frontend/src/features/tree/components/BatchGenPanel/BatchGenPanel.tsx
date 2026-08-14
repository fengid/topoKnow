import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  StopCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import type { BatchGenTask, QueueItem } from '@/types/batchGen'
import { ProgressBar } from './ProgressBar'
import { QueueList } from './QueueList'

interface BatchGenPanelProps {
  task: BatchGenTask | null
  items: QueueItem[]
  isConnected: boolean
  isPanelOpen: boolean
  error: string | null
  onToggle: () => void
  onCancel: () => void
  onRetry: (itemId: string) => void
}

/**
 * 批量生成面板：从右侧滑入/滑出。
 * 一致性：手柄常驻于面板左缘——滑入状态点手柄滑出，滑出状态点手柄滑入，
 * 手柄随面板平移，同一控件提供双向对称的切换入口，状态机闭环。
 */
export function BatchGenPanel({
  task,
  items,
  isConnected,
  isPanelOpen,
  error,
  onToggle,
  onCancel,
  onRetry,
}: BatchGenPanelProps) {
  return (
    <>
      {/* 滑出状态的手柄：面板隐藏时贴画布右缘，点击滑入 */}
      <AnimatePresence>
        {!isPanelOpen && (
          <motion.button
            key="panel-handle"
            initial={{ x: 48, y: '-50%', opacity: 0 }}
            animate={{ x: 0, y: '-50%', opacity: 1 }}
            exit={{ x: 48, y: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={onToggle}
            className="absolute top-1/2 right-0 z-50 p-2.5 rounded-l-xl"
            style={{
              background: 'var(--ios-glass)',
              backdropFilter: 'blur(var(--glass-blur-heavy)) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(var(--glass-blur-heavy)) saturate(var(--glass-saturate))',
              border: '1px solid var(--glass-border)',
              borderRight: 'none',
              color: 'var(--home-gold-text)',
            }}
            title="展开批量生成面板"
          >
            <PanelRightOpen className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 面板主体：滑入/滑出共用同一动画参数 */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 h-full w-[360px] z-50 flex flex-col"
            style={{
              background: 'var(--ios-glass)',
              backdropFilter: 'blur(var(--glass-blur-heavy)) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(var(--glass-blur-heavy)) saturate(var(--glass-saturate))',
              borderLeft: '1px solid var(--glass-border)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--glass-border-light)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--home-gold-text)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--ios-text-primary)' }}>
                  批量生成
                </span>
                {task && <TaskStatusBadge status={task.status} />}
              </div>

              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--ios-accent-green)' }} />
                ) : (
                  <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--ios-text-tertiary)' }} />
                )}
              </div>
            </div>

            {/* 进度 / 错误 / 队列 / 取消按钮（原逻辑不变） */}
            {task && (
              <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--glass-border-light)' }}>
                <ProgressBar
                  completed={task.completed_items}
                  failed={task.failed_items}
                  total={task.total_items}
                />
              </div>
            )}

            {error && (
              <div
                className="px-4 py-2 text-xs flex-shrink-0"
                style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--ios-accent-red)' }}
              >
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 py-3">
              <QueueList items={items} onRetry={onRetry} />
            </div>

            {/* Footer：滑出按钮（左侧手柄语义）+ 取消任务 */}
            <div
              className="px-4 py-3 flex-shrink-0 flex items-center gap-2"
              style={{ borderTop: '1px solid var(--glass-border-light)' }}
            >
              <button
                onClick={onToggle}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: 'var(--glass-bg-light)',
                  color: 'var(--ios-text-secondary)',
                  flex: task && task.status === 'running' ? '0 0 auto' : '1',
                }}
                title="收起面板"
              >
                <PanelRightClose className="w-4 h-4" />
                收起
              </button>
              {task && task.status === 'running' && (
                <button
                  onClick={onCancel}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: 'rgba(255, 69, 58, 0.1)',
                    color: 'var(--ios-accent-red)',
                  }}
                >
                  <StopCircle className="w-4 h-4" />
                  取消任务
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function TaskStatusBadge({ status }: { status: BatchGenTask['status'] }) {
  switch (status) {
    case 'running':
      return (
        <span className="ios-badge ios-badge-blue text-[10px] px-1.5 py-0.5">
          运行中
        </span>
      )
    case 'completed':
      return (
        <span className="ios-badge ios-badge-green text-[10px] px-1.5 py-0.5 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          完成
        </span>
      )
    case 'cancelled':
      return (
        <span className="ios-badge ios-badge-orange text-[10px] px-1.5 py-0.5 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          已取消
        </span>
      )
    default:
      return null
  }
}
