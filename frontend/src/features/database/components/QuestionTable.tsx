import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import type { Question } from '../types/database'

interface QuestionTableProps {
  data: Question[]
  onDelete: (id: string) => void
  isDeleting: boolean
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  setDeleteId: (id: string | null) => void
  setDeleteMode: (mode: 'single' | 'batch' | null) => void
}

export default function QuestionTable({
  data,
  isDeleting,
  selectedIds,
  setSelectedIds,
  setDeleteId,
  setDeleteMode
}: QuestionTableProps) {
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
                问题
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                标签
              </th>
              <th className="px-6 py-4 text-left text-xs font-playfair font-medium text-[var(--home-text)] uppercase tracking-wider">
                来源
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
            {data.map((question) => (
              <React.Fragment key={question.id}>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ boxShadow: '0 0 30px rgba(201,169,110,0.1)' }}
                  className="hover:bg-[var(--home-card-hover)] transition-all"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(question.id)}
                      onChange={() => toggleSelect(question.id)}
                      className="w-4 h-4 rounded border-[var(--home-card-border)] text-[var(--home-gold-text)] focus:ring-[var(--home-gold-text)]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
                      className="text-sm text-[var(--home-gold-text)] hover:underline font-mono"
                    >
                      {truncateId(question.id)}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)] font-outfit max-w-md">
                    <div className="line-clamp-2">{question.question}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {question.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {question.tags.length > 2 && (
                        <span className="px-2 py-1 text-xs text-[var(--home-text)]/60 font-outfit">
                          +{question.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)]/60 font-outfit">
                    {question.source}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--home-text)]/60 font-outfit">
                    {new Date(question.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setDeleteId(question.id)
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
                  {expandedId === question.id && (
                    <motion.tr
                      key={`${question.id}-expanded`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-r from-[var(--home-gold-text)]/5 to-transparent"
                    >
                      <td colSpan={7} className="px-6 py-4">
                        <div className="space-y-4 text-sm">
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">完整 ID: </span>
                            <span className="text-[var(--home-text)]/60 font-outfit font-mono">{question.id}</span>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">Node ID: </span>
                            <span className="text-[var(--home-text)]/60 font-outfit font-mono">{question.node_id}</span>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">完整问题: </span>
                            <p className="text-[var(--home-text)]/60 font-outfit mt-1">{question.question}</p>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">答案: </span>
                            <div className="mt-2 prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{question.answer}</ReactMarkdown>
                            </div>
                          </div>
                          <div>
                            <span className="font-playfair font-medium text-[var(--home-gold-text)]">所有标签: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {question.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
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
