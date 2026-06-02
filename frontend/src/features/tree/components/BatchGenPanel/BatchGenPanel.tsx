import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Wifi,
  WifiOff,
  StopCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
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
  onClose: () => void
  onCancel: () => void
  onRetry: (itemId: string) => void
}

export function BatchGenPanel({
  task,
  items,
  isConnected,
  isPanelOpen,
  error,
  onClose,
  onCancel,
  onRetry,
}: BatchGenPanelProps) {
  return (
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
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--glass-bg-light)]"
              >
                <X className="w-4 h-4" style={{ color: 'var(--ios-text-tertiary)' }} />
              </button>
            </div>
          </div>

          {/* Progress */}
          {task && (
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--glass-border-light)' }}>
              <ProgressBar
                completed={task.completed_items}
                failed={task.failed_items}
                total={task.total_items}
              />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="px-4 py-2 text-xs flex-shrink-0"
              style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--ios-accent-red)' }}
            >
              {error}
            </div>
          )}

          {/* Queue list */}
          <div className="flex-1 overflow-y-auto px-2 py-3">
            <QueueList items={items} onRetry={onRetry} />
          </div>

          {/* Footer actions */}
          {task && (task.status === 'running') && (
            <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--glass-border-light)' }}>
              <button
                onClick={onCancel}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: 'rgba(255, 69, 58, 0.1)',
                  color: 'var(--ios-accent-red)',
                }}
              >
                <StopCircle className="w-4 h-4" />
                取消任务
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
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
