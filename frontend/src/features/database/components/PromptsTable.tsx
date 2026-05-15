import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Prompt } from '../types/database'

interface PromptsTableProps {
  data: Prompt[]
  onDelete: (id: string) => void
  isDeleting: boolean
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  setDeleteId: (id: string | null) => void
  setDeleteMode: (mode: 'single' | 'batch' | null) => void
}

export default function PromptsTable({
  data,
  isDeleting,
  selectedIds,
  setSelectedIds,
  setDeleteId,
  setDeleteMode
}: PromptsTableProps) {
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

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  }

  const parseVariables = (variables: string[] | string): string[] => {
    if (Array.isArray(variables)) {
      return variables
    }
    if (typeof variables === 'string') {
      try {
        const parsed = JSON.parse(variables)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

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
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
                名称
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                分类
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                版本
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                状态
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
            {data.map((prompt) => (
              <React.Fragment key={prompt.id}>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ boxShadow: '0 0 30px rgba(201,169,110,0.1)' }}
                  className="hover:bg-[var(--home-card-hover)] transition-all"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(prompt.id)}
                      onChange={() => toggleSelect(prompt.id)}
                      className="w-4 h-4 rounded border-[var(--home-card-border)] text-[var(--home-gold-text)] focus:ring-[var(--home-gold-text)]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                      className="text-sm text-[var(--home-gold-text)] hover:underline font-mono"
                    >
                      {truncateId(prompt.id)}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)] font-outfit font-medium">
                    {prompt.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)]/60 font-outfit">
                    {prompt.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)]/60 font-outfit">
                    {prompt.version}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(prompt.is_active)}`}>
                      {prompt.is_active ? '活跃' : '未激活'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)]/60 font-outfit">
                    {new Date(prompt.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setDeleteId(prompt.id)
                        setDeleteMode('single')
                      }}
                      disabled={isDeleting}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </td>
                </motion.tr>
                <AnimatePresence>
                  {expandedId === prompt.id && (
                    <motion.tr
                      key={`${prompt.id}-expanded`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-r from-[var(--home-gold-text)]/5 to-transparent"
                    >
                      <td colSpan={8} className="px-6 py-4">
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">完整 ID: </span>
                            <span className="text-[var(--home-text)]/60 font-outfit font-mono">{prompt.id}</span>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">描述: </span>
                            <span className="text-[var(--home-text)]/60 font-outfit">{prompt.description}</span>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">模板内容: </span>
                            <div className="mt-2 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {prompt.template}
                            </div>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">变量: </span>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {parseVariables(prompt.variables).map((variable, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                >
                                  {variable}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">更新时间: </span>
                            <span className="text-[var(--home-text)]/60 font-outfit">
                              {new Date(prompt.updated_at).toLocaleString('zh-CN')}
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
