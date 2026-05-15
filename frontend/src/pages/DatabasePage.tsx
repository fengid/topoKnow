import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../features/database/components/Sidebar'
import TableContainer from '../features/database/components/TableContainer'
import TreeTable from '../features/database/components/TreeTable'
import NodeTable from '../features/database/components/NodeTable'
import QuestionTable from '../features/database/components/QuestionTable'
import ArticleTable from '../features/database/components/ArticleTable'
import PromptsTable from '../features/database/components/PromptsTable'
import Navbar from '@/components/Navbar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useTableData } from '../features/database/hooks/useTableData'
import { useTableFilters } from '../features/database/hooks/useTableFilters'
import type { TableName, Tree, Node, Question, Article, Prompt } from '../features/database/types/database'

export default function DatabasePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedTable, setSelectedTable] = useState<TableName>(
    (searchParams.get('table') as TableName) || 'trees'
  )

  // 删除状态管理
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteMode, setDeleteMode] = useState<'single' | 'batch' | null>(null)

  const { data, isLoading, error, deleteItem, isDeleting } = useTableData(selectedTable)

  const getSearchFields = () => {
    switch (selectedTable) {
      case 'trees':
        return ['root_topic', 'description'] as const
      case 'nodes':
        return ['topic', 'description'] as const
      case 'questions':
        return ['question', 'answer', 'tags'] as const
      case 'articles':
        return ['title', 'content'] as const
      case 'prompts':
        return ['name', 'category', 'description'] as const
      default:
        return [] as const
    }
  }

  const {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    paginatedData,
    totalPages,
    totalItems,
  } = useTableFilters(data, getSearchFields() as any)

  useEffect(() => {
    setSearchParams({ table: selectedTable })
    setCurrentPage(1)
    // 切换表格时清空选择状态
    setSelectedIds(new Set())
    setDeleteId(null)
    setDeleteMode(null)
  }, [selectedTable, setSearchParams, setCurrentPage])

  const handleSelectTable = (table: TableName) => {
    setSelectedTable(table)
  }

  const handleDelete = async () => {
    if (deleteId) {
      await deleteItem(deleteId)
      setDeleteId(null)
      setDeleteMode(null)
    }
  }

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteItem(id)
    }
    setSelectedIds(new Set())
    setDeleteMode(null)
  }

  const renderTable = () => {
    switch (selectedTable) {
      case 'trees':
        return (
          <TreeTable
            data={paginatedData as Tree[]}
            onDelete={deleteItem}
            isDeleting={isDeleting}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            setDeleteId={setDeleteId}
            setDeleteMode={setDeleteMode}
          />
        )
      case 'nodes':
        return (
          <NodeTable
            data={paginatedData as Node[]}
            onDelete={deleteItem}
            isDeleting={isDeleting}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            setDeleteId={setDeleteId}
            setDeleteMode={setDeleteMode}
          />
        )
      case 'questions':
        return (
          <QuestionTable
            data={paginatedData as Question[]}
            onDelete={deleteItem}
            isDeleting={isDeleting}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            setDeleteId={setDeleteId}
            setDeleteMode={setDeleteMode}
          />
        )
      case 'articles':
        return (
          <ArticleTable
            data={paginatedData as Article[]}
            onDelete={deleteItem}
            isDeleting={isDeleting}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            setDeleteId={setDeleteId}
            setDeleteMode={setDeleteMode}
          />
        )
      case 'prompts':
        return (
          <PromptsTable
            data={paginatedData as Prompt[]}
            onDelete={deleteItem}
            isDeleting={isDeleting}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            setDeleteId={setDeleteId}
            setDeleteMode={setDeleteMode}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--home-bg)' }}>
      {/* 环境光晕 */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'var(--home-glow-ambient)' }}
      />

      {/* 噪点纹理 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.035 }}>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* 顶部导航栏 */}
      <Navbar />

      {/* 原有的侧边栏 + 内容区 */}
      <div className="relative flex h-[calc(100vh-4rem)]">
        <Sidebar selectedTable={selectedTable} onSelectTable={handleSelectTable} />
        <TableContainer
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          isLoading={isLoading}
          error={error}
        >
          {renderTable()}
        </TableContainer>
      </div>

      {/* 页面级别的确认对话框 */}
      <ConfirmDialog
        isOpen={deleteMode === 'single' && deleteId !== null}
        title="确认删除"
        message={`确定要删除这条记录吗？此操作不可恢复。`}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteId(null)
          setDeleteMode(null)
        }}
      />

      <ConfirmDialog
        isOpen={deleteMode === 'batch'}
        title="批量删除"
        message={`确定要删除选中的 ${selectedIds.size} 项吗？此操作不可恢复。`}
        variant="danger"
        onConfirm={handleBatchDelete}
        onCancel={() => setDeleteMode(null)}
      />
    </div>
  )
}
