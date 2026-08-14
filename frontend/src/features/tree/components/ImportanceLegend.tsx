import { motion } from 'framer-motion'
import { useThemeStore } from '@/store'

const LEVELS = [
  { label: '高重要性', color: 'rgba(255,59,48,0.8)' },
  { label: '中等', color: 'rgba(255,149,0,0.8)' },
  { label: '低', color: 'rgba(52,199,89,0.8)' },
]

/** 重要性图例（Obsidian Luxe 风格） */
export function ImportanceLegend() {
  const { resolvedTheme } = useThemeStore()

  return (
    <div className="absolute bottom-5 right-5 z-[1000]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="p-5 rounded-2xl space-y-3"
        style={{
          background: resolvedTheme === 'dark' ? 'rgba(20, 20, 20, 0.85)' : 'rgba(250, 250, 248, 0.88)',
          border: '1px solid var(--home-card-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="font-playfair text-xs mb-4" style={{ color: 'var(--home-text)' }}>
          重要性图例
        </div>
        {LEVELS.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-md"
              style={{
                borderLeft: `3px solid ${color}`,
                background: resolvedTheme === 'dark' ? 'rgba(40, 40, 40, 0.8)' : 'rgba(240, 240, 238, 0.8)',
              }}
            />
            <span className="font-outfit text-xs" style={{ color: 'var(--home-text-sub)' }}>{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
