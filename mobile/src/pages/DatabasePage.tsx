import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GitBranch,
  BookOpen,
  MessageCircle,
  FileText,
  Search,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  X,
} from 'lucide-react'
import TabBar from '../components/TabBar'
import AppBar from '../components/AppBar'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { ModeBadge, ImportanceBadge } from '../components/Badges'
import { databaseApi, type DbTableName, type DbRecord } from '../api/databaseApi'
import type { Article, Prompt, Question, Tree, TreeNode } from '../types'

const PAGE_SIZE = 10

const TABLES: { key: DbTableName; label: string; icon: typeof GitBranch }[] = [
  { key: 'trees', label: '图谱', icon: GitBranch },
  { key: 'nodes', label: '节点', icon: GitBranch },
  { key: 'articles', label: '文章', icon: BookOpen },
  { key: 'questions', label: '练习题', icon: MessageCircle },
  { key: 'prompts', label: '提示词', icon: FileText },
]

/* ---------- 各表记录渲染 ---------- */
function RecordContent({ table, record }: { table: DbTableName; record: DbRecord }) {
  if (table === 'trees') {
    const t = record as Tree
    return (
      <>
        <div className="row__title">{t.root_topic || '未命名'}</div>
        <div className="row__meta">
          <ModeBadge mode={t.mode} />
          {t.created_at && <span className="text-xs text-faint">{t.created_at.slice(0, 10)}</span>}
        </div>
      </>
    )
  }
  if (table === 'nodes') {
    const n = record as TreeNode
    return (
      <>
        <div className="row__title">{n.topic}</div>
        <div className="row__meta">
          <ImportanceBadge importance={n.importance} />
          <span className="badge badge--plain">第 {(n.depth ?? 0) + 1} 层</span>
          {n.has_article && <span className="badge badge--gold">有文章</span>}
          {(n.question_count ?? 0) > 0 && (
            <span className="badge badge--plain">{n.question_count} 题</span>
          )}
        </div>
        {n.description && <div className="row__sub">{n.description}</div>}
      </>
    )
  }
  if (table === 'articles') {
    const a = record as Article
    return (
      <>
        <div className="row__title">{a.title}</div>
        <div className="row__sub">{a.content?.slice(0, 60)}...</div>
        <div className="row__meta">
          <span className="text-xs text-faint">{a.updated_at?.slice(0, 10)}</span>
        </div>
      </>
    )
  }
  if (table === 'questions') {
    const q = record as Question
    return (
      <>
        <div className="row__title">{q.question}</div>
        <div className="row__sub">{q.answer?.slice(0, 50)}...</div>
        <div className="row__meta">
          {q.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="badge badge--plain">
              {tag}
            </span>
          ))}
        </div>
      </>
    )
  }
  const p = record as Prompt
  return (
    <>
      <div className="row__title">
        {p.name} <span className="text-faint">v{p.version}</span>
      </div>
      <div className="row__meta">
        <span className="badge badge--gold">{p.category}</span>
        {p.is_active ? (
          <span className="badge badge--green">启用</span>
        ) : (
          <span className="badge badge--plain">停用</span>
        )}
      </div>
      {p.description && <div className="row__sub">{p.description}</div>}
    </>
  )
}

/* ---------- 主页面 ---------- */
export default function DatabasePage() {
  const [table, setTable] = useState<DbTableName>('trees')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [batchConfirm, setBatchConfirm] = useState(false)

  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['db', table],
    queryFn: () => databaseApi.getAll(table),
  })

  // 切换表时重置状态
  useEffect(() => {
    setSearch('')
    setPage(1)
    setSelectMode(false)
    setSelectedIds(new Set())
    setDeleteId(null)
  }, [table])

  const deleteMutation = useMutation({
    mutationFn: ({ table, id }: { table: DbTableName; id: string }) =>
      databaseApi.delete(table, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', table] })
    },
  })

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await databaseApi.delete(table, id)
      }
    },
    onSuccess: () => {
      setSelectedIds(new Set())
      setSelectMode(false)
      queryClient.invalidateQueries({ queryKey: ['db', table] })
    },
  })

  /* ---------- 搜索过滤 ---------- */
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword || !data) return data ?? []
    return data.filter((record) => {
      const r = record as unknown as Record<string, unknown>
      const fields: string[] =
        table === 'trees'
          ? ['root_topic', 'description']
          : table === 'nodes'
            ? ['topic', 'description']
            : table === 'articles'
              ? ['title', 'content']
              : table === 'questions'
                ? ['question', 'answer', 'tags']
                : ['name', 'category', 'description']
      return fields.some((f) => String(r[f] ?? '').toLowerCase().includes(keyword))
    })
  }, [data, search, table])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const allPageSelected =
    paged.length > 0 && paged.every((r) => selectedIds.has((r as { id: string }).id))

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        paged.forEach((r) => next.delete((r as { id: string }).id))
      } else {
        paged.forEach((r) => next.add((r as { id: string }).id))
      }
      return next
    })
  }

  return (
    <div className="page">
      <AppBar
        title="数据库管理"
        subtitle={`${data?.length ?? 0} 条记录`}
        right={
          <>
            <button
              className="appbar__btn"
              aria-label="刷新"
              onClick={() => refetch()}
            >
              <RefreshCw size={18} className={isRefetching ? 'spin' : undefined} />
            </button>
            <button
              className="appbar__btn"
              aria-label="批量管理"
              onClick={() => {
                setSelectMode(!selectMode)
                setSelectedIds(new Set())
              }}
            >
              {selectMode ? <X size={18} /> : <CheckSquare size={18} />}
            </button>
          </>
        }
      />

      <div className="page-body">
        {/* 表选择 */}
        <div className="chip-scroll">
          {TABLES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`chip${table === key ? ' active' : ''}`}
              onClick={() => setTable(key)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        {selectMode ? (
          <button
            className="btn btn--ghost btn--sm mt-12"
            style={{ width: '100%' }}
            onClick={toggleSelectAll}
          >
            {allPageSelected ? (
              <>
                <Square size={15} />
                取消全选本页
              </>
            ) : (
              <>
                <CheckSquare size={15} />
                全选本页（{paged.length}）
              </>
            )}
          </button>
        ) : (
          <div className="searchbar mt-12">
            <Search size={16} />
            <input
              placeholder="搜索当前表..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        )}

        {/* 列表 */}
        <div className="mt-16">
          {isLoading ? (
            <Loading label="加载数据..." />
          ) : isError ? (
            <EmptyState
              icon={<RefreshCw size={26} />}
              title="加载失败"
              action={
                <button className="btn btn--gold" onClick={() => refetch()}>
                  重试
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText size={26} />}
              title={search ? '没有匹配的记录' : '暂无数据'}
              desc={search ? '换个关键词试试' : undefined}
            />
          ) : (
            paged.map((record) => {
              const r = record as { id: string }
              return (
                <div key={r.id} className="row" style={{ marginBottom: 10 }}>
                  {selectMode && (
                    <button
                      className={`selectbox${selectedIds.has(r.id) ? ' checked' : ''}`}
                      aria-label="选择"
                      onClick={() => toggleSelect(r.id)}
                    >
                      <CheckSquare size={14} />
                    </button>
                  )}
                  <div className="row__main">
                    <RecordContent table={table} record={record} />
                  </div>
                  {!selectMode && (
                    <button
                      className="row__more"
                      aria-label="删除"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 分页 */}
        {filtered.length > PAGE_SIZE && (
          <div className="pager">
            <button
              className="pager__btn"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={15} />
              上一页
            </button>
            <span className="pager__info">
              {safePage} / {totalPages}
            </span>
            <button
              className="pager__btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              下一页
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* 批量删除操作栏 */}
      {selectMode && selectedIds.size > 0 && (
        <div className="selection-bar">
          <button
            className="btn btn--ghost"
            style={{ flex: 1 }}
            onClick={() => setSelectedIds(new Set())}
          >
            清空选择（{selectedIds.size}）
          </button>
          <button
            className="btn btn--danger"
            style={{ flex: 1 }}
            onClick={() => setBatchConfirm(true)}
          >
            <Trash2 size={16} />
            删除 {selectedIds.size} 项
          </button>
        </div>
      )}

      {/* 单条删除确认 */}
      <ConfirmDialog
        open={deleteId !== null}
        title="确认删除"
        message="确定要删除这条记录吗？此操作不可恢复。"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate({ table, id: deleteId })
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* 批量删除确认 */}
      <ConfirmDialog
        open={batchConfirm}
        title="批量删除"
        message={`确定要删除选中的 ${selectedIds.size} 项吗？此操作不可恢复。`}
        confirmText={batchDeleteMutation.isPending ? '删除中...' : '删除'}
        onConfirm={() => batchDeleteMutation.mutate([...selectedIds])}
        onCancel={() => setBatchConfirm(false)}
      />

      <TabBar />
    </div>
  )
}
