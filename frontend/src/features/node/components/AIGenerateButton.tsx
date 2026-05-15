import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

// AI Generate Button — Obsidian Luxe gold glass style
export function AIGenerateButton({
  onClick,
  isLoading,
  label,
}: {
  onClick: () => void
  isLoading: boolean
  label: string
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={isLoading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative group overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))',
        border: '1px solid rgba(201,169,110,0.25)',
        boxShadow: 'inset 0 1px 0 rgba(201,169,110,0.15)',
      }}
    >
      {/* Gold shine sweep on hover */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(201,169,110,0.12)] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Hover background intensify */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.18), rgba(201,169,110,0.08))' }}
      />

      {/* Content */}
      <div className="relative z-10 px-8 py-4 flex items-center justify-center gap-3">
        <Sparkles
          className={`w-5 h-5 ${isLoading ? 'animate-spin' : 'animate-pulse'}`}
          style={{ color: 'var(--home-gold-text)' }}
        />
        <span
          className="font-semibold text-lg font-outfit"
          style={{ color: 'var(--home-gold-text)' }}
        >
          {isLoading ? '生成中...' : label}
        </span>
      </div>
    </motion.button>
  )
}
