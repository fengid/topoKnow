import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface TableContainerProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  isLoading: boolean
  error: any
  children: ReactNode
}

export default function TableContainer({
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  isLoading,
  error,
  children,
}: TableContainerProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* 搜索栏 */}
      <div className="p-6 bg-[var(--home-card-bg)] border-b border-[var(--home-card-border)] backdrop-blur-sm">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索..."
            className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--home-card-bg)] border border-[var(--home-card-border)] text-[var(--home-text)] placeholder-[var(--home-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--home-gold-text)]/50 font-outfit transition-all"
            style={{ boxShadow: '0 0 0 0 rgba(201,169,110,0)' }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 40px rgba(201,169,110,0.2)'
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = '0 0 0 0 rgba(201,169,110,0)'
            }}
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--home-gold-text)]/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              className="w-12 h-12 border-4 border-[var(--home-gold-text)]/30 border-t-[var(--home-gold-text)] rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-red-600 dark:text-red-400 font-outfit">加载失败</p>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--home-card-bg)] border border-[var(--home-card-border)] rounded-2xl overflow-hidden">
            {children}
          </div>
        )}
      </div>

      {/* 分页控制 */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="p-6 bg-[var(--home-card-bg)] border-t border-[var(--home-card-border)] backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--home-text)]/60 font-outfit">
              共 {totalItems} 条记录
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-[var(--home-card-bg)] border border-[var(--home-card-border)] text-[var(--home-text)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--home-card-hover)] transition-colors font-outfit"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-[var(--home-text)] font-outfit">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-[var(--home-card-bg)] border border-[var(--home-card-border)] text-[var(--home-text)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--home-card-hover)] transition-colors font-outfit"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
