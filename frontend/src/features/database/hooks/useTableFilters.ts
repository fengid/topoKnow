import { useState, useMemo } from 'react'

export function useTableFilters<T extends Record<string, any>>(
  data: T[],
  searchFields: (keyof T)[]
) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof T>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const filteredData = useMemo(() => {
    let result = [...data]

    // 搜索过滤
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field]
          if (typeof value === 'string') {
            return value.toLowerCase().includes(lowerSearch)
          }
          if (Array.isArray(value)) {
            return value.some((v: any) =>
              String(v).toLowerCase().includes(lowerSearch)
            )
          }
          return false
        })
      )
    }

    // 排序
    result.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal === bVal) return 0

      const comparison = aVal > bVal ? 1 : -1
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [data, searchTerm, sortField, sortOrder, searchFields])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  return {
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    paginatedData,
    totalPages,
    totalItems: filteredData.length,
  }
}
