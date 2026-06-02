import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Layers } from 'lucide-react'

interface BatchGenStartDialogProps {
  isOpen: boolean
  nodeTopic: string
  onClose: () => void
  onStart: (layers: number) => void
}

export function BatchGenStartDialog({ isOpen, nodeTopic, onClose, onStart }: BatchGenStartDialogProps) {
  const [layers, setLayers] = useState(2)

  const handleStart = () => {
    onStart(layers)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[340px] rounded-2xl p-5 space-y-5"
            style={{
              background: 'var(--ios-bg-secondary)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 12px 48px var(--shadow-color-heavy)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(201, 169, 110, 0.12)' }}
              >
                <Sparkles className="w-4.5 h-4.5" style={{ color: 'var(--home-gold-text)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ios-text-primary)' }}>
                  批量生成
                </h3>
                <p className="text-xs truncate max-w-[220px]" style={{ color: 'var(--ios-text-tertiary)' }}>
                  {nodeTopic}
                </p>
              </div>
            </div>

            {/* Layer selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: 'var(--ios-text-tertiary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--ios-text-secondary)' }}>
                  生成层数
                </span>
              </div>

              <div className="flex items-center gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLayers(n)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: layers === n ? 'var(--ios-accent-blue)' : 'var(--glass-bg-light)',
                      color: layers === n ? 'white' : 'var(--ios-text-secondary)',
                      border: `1px solid ${layers === n ? 'var(--ios-accent-blue)' : 'var(--glass-border-light)'}`,
                    }}
                  >
                    {n} 层
                  </button>
                ))}
              </div>

              <p className="text-[10px]" style={{ color: 'var(--ios-text-tertiary)' }}>
                AI 将逐层生成子节点及其文章，最多 2 个并发
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: 'var(--glass-bg-light)',
                  color: 'var(--ios-text-secondary)',
                  border: '1px solid var(--glass-border-light)',
                }}
              >
                取消
              </button>
              <button
                onClick={handleStart}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: 'linear-gradient(180deg, #3399FF 0%, var(--ios-accent-blue) 100%)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(10, 132, 255, 0.3)',
                }}
              >
                开始生成
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
