import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { QueueItem as QueueItemType, ItemType } from '@/types/batchGen'
import { QueueItemRow } from './QueueItemRow'

interface QueueListProps {
  items: QueueItemType[]
  onRetry: (itemId: string) => void
}

interface TreeDepthGroup {
  depth: number
  label: string
  items: QueueItemType[]
}

const typeOrder: Record<ItemType, number> = {
  generate_nodes: 0,
  generate_article: 1,
}

export function QueueList({ items, onRetry }: QueueListProps) {
  const groups = useMemo(() => {
    const map = new Map<number, TreeDepthGroup>()

    for (const item of items) {
      const depth = item.tree_depth || item.layer
      if (!map.has(depth)) {
        map.set(depth, { depth, label: `第 ${depth} 层`, items: [] })
      }
      map.get(depth)!.items.push(item)
    }

    const sorted = Array.from(map.values()).sort((a, b) => a.depth - b.depth)

    for (const group of sorted) {
      group.items.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
    }

    return sorted
  }, [items])

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm" style={{ color: 'var(--ios-text-tertiary)' }}>
          暂无任务
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {groups.map((group) => (
          <TreeDepthSection key={group.depth} group={group} onRetry={onRetry} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function TreeDepthSection({ group, onRetry }: { group: TreeDepthGroup; onRetry: (id: string) => void }) {
  const completed = group.items.filter((i) => i.status === 'completed').length
  const total = group.items.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--ios-text-secondary)' }}>
          {group.label}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--ios-text-tertiary)' }}>
          {completed}/{total}
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--glass-border-light)' }} />
      </div>
      <div className="flex flex-col gap-0.5">
        {group.items.map((item) => (
          <QueueItemRow key={item.id} item={item} onRetry={onRetry} />
        ))}
      </div>
    </motion.div>
  )
}
