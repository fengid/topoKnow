import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  FileText,
  GitBranch,
} from 'lucide-react'
import type { QueueItem } from '@/types/batchGen'

interface QueueItemRowProps {
  item: QueueItem
  onRetry: (itemId: string) => void
}

const typeLabel = {
  generate_nodes: '生成节点',
  generate_article: '生成文章',
} as const

const typeIcon = {
  generate_nodes: GitBranch,
  generate_article: FileText,
} as const

function getItemLabel(item: QueueItem): string {
  if (item.type === 'generate_nodes' && item.layer !== item.tree_depth) {
    return '展开子节点'
  }
  return typeLabel[item.type]
}

export function QueueItemRow({ item, onRetry }: QueueItemRowProps) {
  const Icon = typeIcon[item.type] || GitBranch
  const label = getItemLabel(item)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-[var(--glass-bg-light)]"
    >
      <div className="flex-shrink-0">
        <StatusIcon status={item.status} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ios-text-tertiary)' }} />
          <span className="text-sm truncate" style={{ color: 'var(--ios-text-primary)' }}>
            {item.node_topic || label}
          </span>
          <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--ios-text-tertiary)' }}>
            {label}
          </span>
        </div>
        {item.parent_topic && (
          <p className="text-xs mt-0.5 truncate pl-5.5" style={{ color: 'var(--ios-text-tertiary)' }}>
            {item.parent_topic}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.status === 'completed' && item.nodes_created != null && item.nodes_created > 0 && (
          <span className="ios-badge ios-badge-green text-[10px] px-1.5 py-0.5">
            +{item.nodes_created}
          </span>
        )}

        {item.status === 'failed' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry(item.id)
            }}
            className="p-1 rounded-lg transition-colors hover:bg-[var(--glass-bg)]"
            title="重试"
          >
            <RefreshCw className="w-3.5 h-3.5" style={{ color: 'var(--ios-accent-orange)' }} />
          </button>
        )}

        {item.status === 'failed' && item.error && (
          <span
            className="text-[10px] max-w-[80px] truncate"
            style={{ color: 'var(--ios-accent-red)' }}
            title={item.error}
          >
            {item.error}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function StatusIcon({ status }: { status: QueueItem['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" style={{ color: 'var(--ios-text-tertiary)' }} />
    case 'running':
      return <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--ios-accent-blue)' }} />
    case 'completed':
      return <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ios-accent-green)' }} />
    case 'failed':
      return <XCircle className="w-4 h-4" style={{ color: 'var(--ios-accent-red)' }} />
    default:
      return null
  }
}
