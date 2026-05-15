import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Tree } from '../types/database'

interface TreeTableProps {
  data: Tree[]
  onDelete: (id: string) => void
  isDeleting: boolean
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  setDeleteId: (id: string | null) => void
  setDeleteMode: (mode: 'single' | 'batch' | null) => void
}

export default function TreeTable({
  data,
  isDeleting,
  selectedIds,
  setSelectedIds,
  setDeleteId,
  setDeleteMode
}: TreeTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map(item => item.id)))
    }
  }

  const truncateId = (id: string) => `${id.slice(0, 8)}...`

  return (
    <>
      {/* 批量操作工具栏 */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-[var(--home-gold-text)]/10 to-transparent rounded-xl border border-[var(--home-card-border)] flex items-center justify-between">
          <span className="text-sm text-[var(--home-text)] font-outfit">
            已选择 <span className="font-semibold text-[var(--home-gold-text)]">{selectedIds.size}</span> 项
          </span>
          <button
            onClick={() => setDeleteMode('batch')}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 font-outfit"
          >
            批量删除
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[var(--home-gold-text)]/5 to-transparent border-b border-[var(--home-card-border)]">
            <tr>
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-[var(--home-card-border)] text-[var(--home-gold-text)] focus:ring-[var(--home-gold-text)]"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                根主题
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                描述
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-6 py-4 text-right text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--home-card-border)]">
            {data.map((tree) => (
              <React.Fragment key={tree.id}>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-[var(--home-card-hover)] transition-all"
                  whileHover={{
                    boxShadow: '0 0 30px rgba(201,169,110,0.1)'
                  }}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tree.id)}
                      onChange={() => toggleSelect(tree.id)}
                      className="w-4 h-4 rounded border-[var(--home-card-border)] text-[var(--home-gold-text)] focus:ring-[var(--home-gold-text)]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setExpandedId(expandedId === tree.id ? null : tree.id)}
                      className="text-sm text-[var(--home-gold-text)] hover:underline font-mono"
                    >
                      {truncateId(tree.id)}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)] font-medium font-outfit">
                    {tree.root_topic}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)]/60 max-w-md truncate font-outfit">
                    {tree.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)]/60 font-outfit">
                    {new Date(tree.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setDeleteId(tree.id)
                        setDeleteMode('single')
                      }}
                      disabled={isDeleting}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 font-outfit"
                    >
                      删除
                    </button>
                  </td>
                </motion.tr>
                <AnimatePresence>
                  {expandedId === tree.id && (
                    <motion.tr
                      key={`${tree.id}-expanded`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-r from-[var(--home-gold-text)]/5 to-transparent"
                    >
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">完整 ID: </span>
                            <span className="text-[var(--home-text)]/60 font-mono font-outfit">{tree.id}</span>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">完整描述: </span>
                            <span className="text-[var(--home-text)]/60 font-outfit">{tree.description}</span>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">更新时间: </span>
                            <span className="text-[var(--home-text)]/60 font-outfit">
                              {new Date(tree.updated_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
