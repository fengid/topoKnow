import { motion } from 'framer-motion'

// Liquid Glass Card - iOS 26 液态玻璃效果
export function GlowingCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`relative group ${className}`}
    >
      {/* 外层发光边框 - 非常暗 */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-ios-blue/15 via-cyan-400/10 to-ios-blue/15 rounded-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 blur-sm" />

      {/* 液态玻璃主体 */}
      <div className="relative">
        {/* 玻璃态背景 - 非常暗 */}
        <div className="absolute inset-0 bg-black/[0.02] dark:bg-white/[0.015] backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5" />

        {/* 顶部光泽效果 - 非常暗 */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 dark:via-white/5 to-transparent" />
          <div className="absolute top-0 left-1/4 w-1/2 h-[200px] bg-gradient-to-b from-black/[0.02] dark:from-white/2 to-transparent blur-xl" />
        </div>

        {/* 内容 */}
        <div className="relative z-10">{children}</div>
      </div>
    </motion.div>
  )
}
