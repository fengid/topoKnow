import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useThemeStore } from '@/store'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'info',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { resolvedTheme } = useThemeStore()
  const isDark = resolvedTheme === 'dark'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with Liquid Blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 z-50 ${
              isDark ? 'bg-black/80' : 'bg-white/60'
            }`}
            onClick={onCancel}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotateX: 15, y: 50 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -10, y: 30 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                mass: 0.8,
              }}
              className="pointer-events-auto w-full max-w-md"
              style={{ perspective: '1000px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Deconstructed Card with Liquid Glass */}
              <div
                className={`relative overflow-hidden rounded-3xl shadow-2xl ${
                  isDark
                    ? 'bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95'
                    : 'bg-gradient-to-br from-white/95 via-gray-50/90 to-white/95'
                } backdrop-blur-xl border ${
                  isDark ? 'border-white/10' : 'border-gray-200/50'
                }`}
                style={{
                  transform: 'translateZ(0)',
                  fontFamily: "'JetBrains Mono', 'Noto Sans SC', monospace",
                }}
              >
                {/* Animated Gradient Overlay */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    background: isDark
                      ? [
                          'radial-gradient(circle at 0% 0%, #ef4444 0%, transparent 50%)',
                          'radial-gradient(circle at 100% 100%, #f97316 0%, transparent 50%)',
                          'radial-gradient(circle at 0% 100%, #ef4444 0%, transparent 50%)',
                          'radial-gradient(circle at 100% 0%, #f97316 0%, transparent 50%)',
                          'radial-gradient(circle at 0% 0%, #ef4444 0%, transparent 50%)',
                        ]
                      : [
                          'radial-gradient(circle at 0% 0%, #fca5a5 0%, transparent 50%)',
                          'radial-gradient(circle at 100% 100%, #fdba74 0%, transparent 50%)',
                          'radial-gradient(circle at 0% 100%, #fca5a5 0%, transparent 50%)',
                          'radial-gradient(circle at 100% 0%, #fdba74 0%, transparent 50%)',
                          'radial-gradient(circle at 0% 0%, #fca5a5 0%, transparent 50%)',
                        ],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Noise Texture */}
                <div
                  className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon Section - Asymmetric */}
                  <div className="px-8 pt-8 pb-6">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                        delay: 0.1,
                      }}
                      className="relative inline-block"
                    >
                      {/* Glowing Background */}
                      <motion.div
                        className={`absolute inset-0 rounded-2xl blur-xl ${
                          isDark
                            ? 'bg-gradient-to-br from-red-500 to-orange-500'
                            : 'bg-gradient-to-br from-red-400 to-orange-400'
                        }`}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />

                      {/* Icon Container */}
                      <div
                        className={`relative w-16 h-16 rounded-2xl flex items-center justify-center ${
                          isDark
                            ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30'
                            : 'bg-gradient-to-br from-red-100 to-orange-100 border border-red-300/50'
                        }`}
                      >
                        {variant === 'danger' ? (
                          <Trash2
                            className={`w-7 h-7 ${
                              isDark ? 'text-red-400' : 'text-red-600'
                            }`}
                            strokeWidth={2.5}
                          />
                        ) : (
                          <AlertTriangle
                            className={`w-7 h-7 ${
                              isDark ? 'text-orange-400' : 'text-orange-600'
                            }`}
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Text Section - Deconstructed Layout */}
                  <div className="px-8 pb-6 space-y-3">
                    <motion.h2
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className={`text-2xl font-bold tracking-tight ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                    >
                      {title}
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`text-sm leading-relaxed ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                    >
                      {message}
                    </motion.p>
                  </div>

                  {/* Divider with Gradient */}
                  <div className="px-8">
                    <div
                      className={`h-px ${
                        isDark
                          ? 'bg-gradient-to-r from-transparent via-red-500/30 to-transparent'
                          : 'bg-gradient-to-r from-transparent via-red-300/50 to-transparent'
                      }`}
                    />
                  </div>

                  {/* Action Buttons - Asymmetric */}
                  <div className="px-8 py-6 flex items-center justify-end gap-3">
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onCancel}
                      className={`px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                        isDark
                          ? 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border border-gray-700/50'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300/50'
                      }`}
                      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                    >
                      {cancelText}
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onConfirm}
                      className={`relative px-6 py-3 rounded-xl font-bold text-sm text-white overflow-hidden ${
                        isDark
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'
                          : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                      } shadow-lg ${
                        isDark ? 'shadow-red-500/25' : 'shadow-red-400/30'
                      }`}
                      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                    >
                      {/* Button Shine Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 1,
                          ease: 'easeInOut',
                        }}
                      />
                      <span className="relative z-10">{confirmText}</span>
                    </motion.button>
                  </div>
                </div>

                {/* Decorative Corner Elements */}
                <div
                  className={`absolute top-0 right-0 w-32 h-32 ${
                    isDark
                      ? 'bg-gradient-to-br from-red-500/10 to-transparent'
                      : 'bg-gradient-to-br from-red-200/30 to-transparent'
                  } rounded-bl-full`}
                />
                <div
                  className={`absolute bottom-0 left-0 w-24 h-24 ${
                    isDark
                      ? 'bg-gradient-to-tr from-orange-500/10 to-transparent'
                      : 'bg-gradient-to-tr from-orange-200/30 to-transparent'
                  } rounded-tr-full`}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
