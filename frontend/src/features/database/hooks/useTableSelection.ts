import { useState, useCallback } from 'react'

/**
 * 表格选择状态管理 Hook
 * 用于统一处理表格的多选逻辑
 * @param data 表格数据数组
 * @returns 选择状态和操作方法
 */
export function useTableSelection<T extends { id: string }>(data: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === data.length && data.length > 0) {
        return new Set()
      }
      return new Set(data.map((item) => item.id))
    })
  }, [data])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id)
    },
    [selectedIds]
  )

  const isAllSelected = data.length > 0 && selectedIds.size === data.length

  return {
    selectedIds,
    setSelectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    selectedCount: selectedIds.size,
  }
}
