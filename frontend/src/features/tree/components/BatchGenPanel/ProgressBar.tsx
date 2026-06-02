import { motion } from 'framer-motion'

interface ProgressBarProps {
  completed: number
  failed: number
  total: number
}

export function ProgressBar({ completed, failed, total }: ProgressBarProps) {
  const progress = total > 0 ? (completed + failed) / total : 0
  const successRate = total > 0 ? completed / total : 0
  const failRate = total > 0 ? failed / total : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--ios-text-secondary)' }}>
          进度
        </span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--ios-text-tertiary)' }}>
          {completed + failed} / {total}
        </span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg-light)' }}>
        <motion.div
          className="h-full flex"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div
            className="h-full rounded-l-full"
            style={{
              width: `${successRate / Math.max(progress, 0.001) * 100}%`,
              background: 'var(--ios-accent-green)',
              minWidth: progress > 0 ? '4px' : '0',
            }}
          />
          <div
            className="h-full rounded-r-full"
            style={{
              width: `${failRate / Math.max(progress, 0.001) * 100}%`,
              background: 'var(--ios-accent-red)',
            }}
          />
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        {completed > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--ios-accent-green)' }} />
            <span className="text-[10px]" style={{ color: 'var(--ios-text-tertiary)' }}>
              成功 {completed}
            </span>
          </div>
        )}
        {failed > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--ios-accent-red)' }} />
            <span className="text-[10px]" style={{ color: 'var(--ios-text-tertiary)' }}>
              失败 {failed}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
