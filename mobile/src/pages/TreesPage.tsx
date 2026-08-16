import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GitBranch, RefreshCw, Trash2, ChevronRight, Plus } from 'lucide-react'
import TabBar from '../components/TabBar'
import AppBar from '../components/AppBar'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { ModeBadge } from '../components/Badges'
import { treeApi } from '../api/treeApi'
import type { Tree } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function TreesPage() {
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteTopic, setDeleteTopic] = useState('')

  const { data: trees, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['trees'],
    queryFn: async () => {
      const res = await treeApi.getAll()
      return res.data.data ?? []
    },
    staleTime: 1000 * 60,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] })
    },
  })

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <div className="page">
      <AppBar
        title="我的图谱"
        right={
          <button className="appbar__btn" onClick={() => refetch()} aria-label="刷新">
            <RefreshCw size={19} className={isRefetching ? 'spin' : undefined} />
          </button>
        }
      />

      <div className="page-body">
        {isLoading ? (
          <Loading label="加载图谱列表..." />
        ) : isError ? (
          <EmptyState
            icon={<RefreshCw size={28} />}
            title="加载失败"
            desc="网络异常，请重试"
            action={
              <button className="btn btn--gold" onClick={() => refetch()}>
                重新加载
              </button>
            }
          />
        ) : !trees || trees.length === 0 ? (
          <EmptyState
            icon={<GitBranch size={28} />}
            title="还没有知识图谱"
            desc="输入一个学习主题，开始构建你的第一棵知识树"
            action={
              <Link className="btn btn--primary" to="/">
                <Plus size={17} />
                去创建图谱
              </Link>
            }
          />
        ) : (
          trees.map((tree: Tree) => (
            <div key={tree.id} className="row fade-in" style={{ marginBottom: 10 }}>
              <span className="row__icon">
                <GitBranch size={18} />
              </span>
              <Link to={`/tree/${tree.id}`} className="row__main" style={{ color: 'inherit' }}>
                <div className="row__title">{tree.root_topic || '未命名'}</div>
                <div className="row__meta">
                  <ModeBadge mode={tree.mode} />
                  {tree.created_at && (
                    <span className="text-xs text-faint">{formatDate(tree.created_at)}</span>
                  )}
                </div>
              </Link>
              <button
                className="row__more"
                aria-label="删除图谱"
                onClick={() => {
                  setDeleteId(tree.id)
                  setDeleteTopic(tree.root_topic)
                }}
              >
                <Trash2 size={17} />
              </button>
              <Link to={`/tree/${tree.id}`} className="row__more" aria-label="打开">
                <ChevronRight size={18} />
              </Link>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="删除图谱"
        message={`确定要删除「${deleteTopic}」吗？该图谱的全部节点、文章和练习题都会被删除，此操作不可恢复。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <TabBar />
    </div>
  )
}
