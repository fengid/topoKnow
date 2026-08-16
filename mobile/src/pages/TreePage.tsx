import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  MoreHorizontal,
  BookOpen,
  MessageCircle,
  GitBranch,
  Sparkles,
  Layers,
  Trash2,
  Trash,
  FileText,
  Maximize2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Play,
  X,
} from 'lucide-react'
import AppBar from '../components/AppBar'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import ActionSheet, { type SheetAction } from '../components/ActionSheet'
import SegmentedControl from '../components/SegmentedControl'
import { ModeBadge, ImportanceBadge } from '../components/Badges'
import { treeApi } from '../api/treeApi'
import { nodeApi } from '../api/nodeApi'
import { useModelStore } from '../store/modelStore'
import { useBatchGen } from '../hooks/useBatchGen'
import { extractApiError } from '../utils/error'
import type { TreeNode, TreeMode } from '../types'

/* ---------- 批量生成启动面板（选择层数） ---------- */
function BatchStartSheet({
  open,
  topic,
  disabled,
  onClose,
  onStart,
}: {
  open: boolean
  topic: string
  disabled: boolean
  onClose: () => void
  onStart: (layers: number) => void
}) {
  const [layers, setLayers] = useState(2)
  if (!open) return null
  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <div className="flex gap-10">
          <span className="row__icon">
            <Sparkles size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="sheet__title" style={{ marginBottom: 0 }}>
              批量生成
            </div>
            <div className="sheet__desc ellipsis" style={{ marginBottom: 0 }}>
              {topic}
            </div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 16, marginBottom: 8 }}>
          <span className="section-title__text">
            <Layers size={14} />
            生成层数
          </span>
        </div>
        <SegmentedControl
          options={[
            { value: 1, label: '1 层' },
            { value: 2, label: '2 层' },
            { value: 3, label: '3 层' },
          ]}
          value={layers}
          onChange={setLayers}
        />
        <p className="text-xs text-faint" style={{ marginTop: 10 }}>
          AI 将逐层生成子节点及其文章，最多 2 个并发
        </p>

        <div className="sheet__actions">
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            disabled={disabled}
            onClick={() => onStart(layers)}
          >
            <Play size={16} />
            开始生成
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 批量生成进行中的浮动进度条 ---------- */
function BatchPanel({
  completed,
  failed,
  total,
  status,
  onOpen,
  onCancel,
  onDismiss,
}: {
  completed: number
  failed: number
  total: number
  status: string
  onOpen: () => void
  onCancel: () => void
  onDismiss: () => void
}) {
  const done = completed + failed
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  const isRunning = status === 'running'

  return (
    <div className="batch-fab">
      <div className="flex-between" style={{ gap: 10 }}>
        <button
          className="flex gap-10"
          style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
          onClick={onOpen}
        >
          {isRunning ? (
            <Loader2 size={18} className="spin" style={{ color: 'var(--gold-text)' }} />
          ) : (
            <CheckCircle2
              size={18}
              style={{ color: status === 'cancelled' ? 'var(--text-faint)' : 'var(--green)' }}
            />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="text-sm" style={{ fontWeight: 650 }}>
              {isRunning ? '批量生成中' : status === 'cancelled' ? '已取消' : '批量生成完成'}
            </div>
            <div className="progress mt-8" style={{ width: '100%' }}>
              <div className="progress__fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-xs text-sub" style={{ flexShrink: 0 }}>
            {done}/{total || '...'}
          </span>
        </button>
        {isRunning ? (
          <button className="row__more" aria-label="取消" onClick={onCancel}>
            <X size={18} />
          </button>
        ) : (
          <button className="row__more" aria-label="关闭" onClick={onDismiss}>
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- 主页面 ---------- */
export default function TreePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const selectedModelId = useModelStore((s) => s.selectedModelId)
  const topRef = useRef<HTMLDivElement>(null)

  /* ---------- 数据 ---------- */
  const {
    data: treeData,
    isLoading,
    isError,
    error: treeError,
    refetch: refetchTree,
  } = useQuery({
    queryKey: ['tree', id],
    queryFn: async () => {
      const res = await treeApi.getById(id!)
      if (!res.data.success && res.data.error) throw new Error(res.data.error)
      return res.data.data
    },
    enabled: !!id,
    retry: 1,
  })

  /* ---------- 焦点状态进 URL（?focus=节点id）----------
   * 与 Web 端“后退键逐层退出上下文”保持一致的移动端实现：
   * 每次下钻 push 一条历史记录，浏览器/系统返回键即层层上退；
   * 直接分享/刷新带 focus 的链接也能恢复到对应层级 */
  const [searchParams, setSearchParams] = useSearchParams()
  const focusParam = searchParams.get('focus')

  const drillTo = useCallback(
    (nodeId: string | null) => {
      setSearchParams(nodeId ? { focus: nodeId } : {})
    },
    [setSearchParams],
  )

  // 树数据就绪但无根节点 → 回列表
  useEffect(() => {
    if (treeData && !treeData.root_node) navigate('/trees', { replace: true })
  }, [treeData, navigate])

  // 切换树时清除残留焦点（跨树导航本身会丢弃 query，这里作兑底；
  // 用 ref 记录上一棵树，避免初始化时误清深链带来的 focus）
  const prevTreeIdRef = useRef<string | undefined>(id)
  useEffect(() => {
    if (prevTreeIdRef.current !== id) {
      prevTreeIdRef.current = id
      if (searchParams.get('focus')) setSearchParams({}, { replace: true })
    }
  }, [id, searchParams, setSearchParams])

  /* ---------- 派生结构 ---------- */
  const { nodeById, childrenByParent, rootId, breadcrumb, focusNode, focusChildren } =
    useMemo(() => {
      const nodeById = new Map<string, TreeNode>()
      const childrenByParent = new Map<string, TreeNode[]>()
      if (treeData?.root_node) {
        const all = [treeData.root_node, ...(treeData.nodes ?? [])]
        all.forEach((n) => {
          nodeById.set(n.id, n)
          if (n.parent_id) {
            const list = childrenByParent.get(n.parent_id) ?? []
            list.push(n)
            childrenByParent.set(n.parent_id, list)
          }
        })
        childrenByParent.forEach((list, pid) => {
          childrenByParent.set(
            pid,
            [...list].sort((a, b) => (a.position_order ?? 0) - (b.position_order ?? 0)),
          )
        })
      }
      const rootId = treeData?.root_node?.id ?? null
      const focusId =
        focusParam && nodeById.has(focusParam) && focusParam !== rootId ? focusParam : rootId

      const breadcrumb: TreeNode[] = []
      let cursor: string | undefined = focusId ?? undefined
      while (cursor && nodeById.has(cursor)) {
        breadcrumb.unshift(nodeById.get(cursor)!)
        cursor = nodeById.get(cursor)!.parent_id ?? undefined
      }
      return {
        nodeById,
        childrenByParent,
        rootId,
        breadcrumb,
        focusNode: focusId ? nodeById.get(focusId) ?? null : null,
        focusChildren: focusId ? childrenByParent.get(focusId) ?? [] : [],
      }
    }, [treeData, focusParam])

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // 面包屑窄屏截断时，自动滚动到最右（当前层）
  const breadcrumbRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    breadcrumbRef.current?.scrollTo({ left: breadcrumbRef.current.scrollWidth })
  }, [focusParam, treeData])

  /* ---------- Mutations ---------- */
  const [expandError, setExpandError] = useState<string | null>(null)

  const expandMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const res = await nodeApi.expand(nodeId, { topic: '', level: '', model: selectedModelId })
      if (!res.data.success) throw new Error(res.data.error || '展开失败')
      return res.data.data
    },
    // 与 Web 端一致：错误随下一次操作消失；横幅在开始新展开/成功时清除，避免残留旧错误
    onMutate: () => setExpandError(null),
    onSuccess: () => {
      setExpandError(null)
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
    },
    onError: (err: Error) => setExpandError(err.message),
  })

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await nodeApi.delete(nodeId)
      return nodeId
    },
    onSuccess: (nodeId) => {
      if (nodeId === rootId) {
        queryClient.invalidateQueries({ queryKey: ['trees'] })
        navigate('/trees', { replace: true })
        return
      }
      // 若删除的是焦点，回退到其父节点（replace：删除操作不应留下可返回的失效态）
      if (focusParam === nodeId) {
        const parent = nodeById.get(nodeId)?.parent_id ?? null
        setSearchParams(parent && parent !== rootId ? { focus: parent } : {}, { replace: true })
      }
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
    },
  })

  const deleteChildrenMutation = useMutation({
    mutationFn: (nodeId: string) => nodeApi.deleteChildren(nodeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tree', id] }),
  })

  /* ---------- 批量生成 ---------- */
  const batch = useBatchGen(id)
  const [batchTarget, setBatchTarget] = useState<{ nodeId: string; topic: string } | null>(null)
  const [batchDetailOpen, setBatchDetailOpen] = useState(false)

  // 进度推进时刷新树数据
  const prevDoneRef = useRef(0)
  useEffect(() => {
    if (!batch.task) {
      prevDoneRef.current = 0
      return
    }
    const done = batch.task.completed_items + batch.task.failed_items
    if (done > prevDoneRef.current) {
      prevDoneRef.current = done
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
    }
  }, [batch.task, id, queryClient])

  /* ---------- 模式切换 ---------- */
  const currentMode: TreeMode = treeData?.mode === 'interview' ? 'interview' : 'understanding'
  const [modeSwitchPending, setModeSwitchPending] = useState<TreeMode | null>(null)
  const [modeSwitchError, setModeSwitchError] = useState<string | null>(null)
  const [isCreatingMode, setIsCreatingMode] = useState(false)

  const handleModeSwitch = async (target: TreeMode) => {
    if (target === currentMode || !treeData?.root_topic || isCreatingMode) return
    setModeSwitchError(null)
    try {
      const { data } = await treeApi.getAll()
      const existing = (data.data ?? []).find(
        (t) =>
          t.root_topic.trim().toLowerCase() === treeData.root_topic!.trim().toLowerCase() &&
          (t.mode ?? 'understanding') === target,
      )
      if (existing) {
        navigate(`/tree/${existing.id}`)
      } else {
        setModeSwitchPending(target)
      }
    } catch (err) {
      setModeSwitchError(extractApiError(err, '查询树列表失败，请重试'))
    }
  }

  const handleCreateModeTree = async () => {
    if (!modeSwitchPending || !treeData?.root_topic || isCreatingMode) return
    setIsCreatingMode(true)
    setModeSwitchError(null)
    try {
      const { data } = await treeApi.create(treeData.root_topic, modeSwitchPending)
      if (data.success && data.data) {
        setModeSwitchPending(null)
        queryClient.invalidateQueries({ queryKey: ['trees'] })
        navigate(`/tree/${data.data.id}`)
      } else {
        setModeSwitchError(data.error || data.message || '创建失败，请稍后重试')
      }
    } catch (err) {
      setModeSwitchError(extractApiError(err, '创建失败，请稍后重试'))
    } finally {
      setIsCreatingMode(false)
    }
  }

  /* ---------- 确认弹窗 ---------- */
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    message: string
    variant?: 'danger' | 'info'
    onConfirm: () => void
  }>({ open: false, title: '', message: '', onConfirm: () => {} })

  const askDeleteNode = (node: TreeNode) =>
    setConfirmState({
      open: true,
      title: '删除节点',
      message: `确定要删除「${node.topic}」及其所有子节点吗？关联的文章和练习题也会被删除，此操作不可恢复。`,
      variant: 'danger',
      onConfirm: () => {
        deleteNodeMutation.mutate(node.id)
        setConfirmState((s) => ({ ...s, open: false }))
      },
    })

  const askDeleteChildren = (node: TreeNode) =>
    setConfirmState({
      open: true,
      title: '删除所有子节点',
      message: `确定要删除「${node.topic}」的所有子节点吗？关联的练习题和文章也会被删除，此操作不可恢复。`,
      variant: 'danger',
      onConfirm: () => {
        deleteChildrenMutation.mutate(node.id)
        setConfirmState((s) => ({ ...s, open: false }))
      },
    })

  /* ---------- 节点操作面板 ---------- */
  const [actionNode, setActionNode] = useState<TreeNode | null>(null)

  const nodeActions = (node: TreeNode): SheetAction[] => {
    const hasChildren = childrenByParent.has(node.id)
    return [
      {
        key: 'detail',
        label: '查看详情',
        icon: <Maximize2 size={17} />,
        onPress: () => navigate(`/node/${node.id}`),
      },
      {
        key: 'expand',
        label: expandMutation.isPending && expandMutation.variables === node.id
          ? 'AI 展开中...'
          : 'AI 展开子节点',
        icon: <Sparkles size={17} />,
        onPress: () => expandMutation.mutate(node.id),
      },
      {
        key: 'batch',
        label: '批量生成',
        icon: <Layers size={17} />,
        onPress: () => setBatchTarget({ nodeId: node.id, topic: node.topic }),
      },
      ...(hasChildren
        ? [
            {
              key: 'del-children',
              label: '删除所有子节点',
              icon: <Trash size={17} />,
              danger: true,
              onPress: () => askDeleteChildren(node),
            },
          ]
        : []),
      {
        key: 'del',
        label: '删除节点',
        icon: <Trash2 size={17} />,
        danger: true,
        onPress: () => askDeleteNode(node),
      },
    ]
  }

  /* ---------- 渲染 ---------- */
  if (isLoading) {
    return (
      <div className="page page--immersive">
        <AppBar title="知识图谱" backTo="/trees" />
        <Loading label="加载知识图谱..." />
      </div>
    )
  }

  // 加载完成但拿不到数据（树已删除/网络失败）：给出错误态而非无限 Loading（与 Web 端可离开页面一致）
  if (isError || !treeData) {
    return (
      <div className="page page--immersive">
        <AppBar title="知识图谱" backTo="/trees" />
        <div className="page-body">
          <EmptyState
            icon={<GitBranch size={26} />}
            title="图谱加载失败"
            desc={treeError ? extractApiError(treeError, '请稍后重试') : '图谱不存在或已被删除'}
            action={
              <div className="grid-2" style={{ width: '100%' }}>
                <button className="btn btn--ghost" onClick={() => navigate('/trees')}>
                  返回列表
                </button>
                <button className="btn btn--primary" onClick={() => refetchTree()}>
                  重新加载
                </button>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  const expanding =
    expandMutation.isPending &&
    (expandMutation.variables === focusNode?.id ||
      expandMutation.variables === actionNode?.id)

  // AppBar 返回键：层层上退（子层 → 父层 → 根层），根层时才离开页面。
  // 与 Web 端 popstate 守卫“后退逐层退出上下文”的语义一致
  const handleGoUp = () => {
    if (focusNode?.parent_id) {
      // 有父层：上退到父层（父层为根 = 清除 focus）
      const parentId = focusNode.parent_id
      setSearchParams(parentId !== rootId ? { focus: parentId } : {})
      scrollToTop()
      return
    }
    navigate('/trees')
  }

  return (
    <div className="page page--immersive">
      <AppBar
        onBack={handleGoUp}
        title={
          <>
            <span className="ellipsis">{treeData.root_topic}</span>
            <ModeBadge mode={currentMode} />
          </>
        }
        subtitle={`${(treeData.nodes?.length ?? 0) + 1} 个节点`}
        right={
          <button
            className="appbar__btn"
            aria-label="切换模式"
            onClick={() =>
              handleModeSwitch(currentMode === 'understanding' ? 'interview' : 'understanding')
            }
          >
            <RefreshCw size={18} />
          </button>
        }
      />

      <div className="page-body" ref={topRef}>
        {/* ── 面包屑（窄屏截断时自动滚动到当前层） ── */}
        <div className="breadcrumb" ref={breadcrumbRef}>
          {breadcrumb.map((node, i) => (
            <span key={node.id} className="flex" style={{ gap: 4, flexShrink: 0 }}>
              {i > 0 && <ChevronRight size={13} className="breadcrumb__sep" />}
              <button
                className={`breadcrumb__item${i === breadcrumb.length - 1 ? ' current' : ''}`}
                onClick={() => {
                  drillTo(node.id === rootId ? null : node.id)
                  scrollToTop()
                }}
              >
                {node.topic}
              </button>
            </span>
          ))}
        </div>

        {/* ── 当前节点卡片 ── */}
        {focusNode && (
          <div className="card fade-in" style={{ borderColor: 'var(--gold-border)' }}>
            <div className="flex-between" style={{ alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 750, lineHeight: 1.4 }}>
                  {focusNode.topic}
                </div>
                <div className="row__meta">
                  <ImportanceBadge importance={focusNode.importance} />
                  <span className="badge badge--plain">第 {focusNode.depth + 1} 层</span>
                  {focusNode.has_article && (
                    <span className="badge badge--gold">
                      <BookOpen size={11} />
                      有文章
                    </span>
                  )}
                  {(focusNode.question_count ?? 0) > 0 && (
                    <span className="badge badge--plain">
                      <MessageCircle size={11} />
                      {focusNode.question_count} 题
                    </span>
                  )}
                </div>
              </div>
              <button
                className="row__more"
                aria-label="更多操作"
                onClick={() => setActionNode(focusNode)}
              >
                <MoreHorizontal size={20} />
              </button>
            </div>

            {focusNode.description && (
              <p className="text-sub text-sm" style={{ marginTop: 10, lineHeight: 1.7 }}>
                {focusNode.description}
              </p>
            )}

            <div className="grid-2 mt-12">
              <button
                className="btn btn--gold btn--sm"
                disabled={expanding}
                onClick={() => expandMutation.mutate(focusNode.id)}
              >
                {expanding ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
                {expanding ? '生成中...' : 'AI 展开子节点'}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => navigate(`/node/${focusNode.id}`)}
              >
                <FileText size={15} />
                查看详情
              </button>
            </div>
          </div>
        )}

        {/* ── 子节点列表 ── */}
        <div className="section-title">
          <span className="section-title__text">
            <GitBranch size={14} />
            子节点（{focusChildren.length}）
          </span>
        </div>

        {focusChildren.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={26} />}
            title="暂无子节点"
            desc={expanding ? 'AI 正在生成子节点...' : '让 AI 展开当前节点，生成下一层知识'}
            action={
              !expanding && focusNode ? (
                <button
                  className="btn btn--gold btn--sm"
                  onClick={() => expandMutation.mutate(focusNode.id)}
                >
                  <Sparkles size={15} />
                  AI 展开子节点
                </button>
              ) : undefined
            }
          />
        ) : (
          focusChildren.map((child) => {
            const childCount = childrenByParent.get(child.id)?.length ?? 0
            const childExpanding = expandMutation.isPending && expandMutation.variables === child.id
            return (
              <div key={child.id} className="row" style={{ marginBottom: 10 }}>
                <button
                  className="row__main"
                  onClick={() => {
                    drillTo(child.id)
                    scrollToTop()
                  }}
                >
                  <div className="row__title">{child.topic}</div>
                  <div className="row__meta">
                    <ImportanceBadge importance={child.importance} />
                    {child.has_article && (
                      <span className="badge badge--gold">
                        <BookOpen size={11} />
                        文章
                      </span>
                    )}
                    {(child.question_count ?? 0) > 0 && (
                      <span className="badge badge--plain">{child.question_count} 题</span>
                    )}
                    {childCount > 0 && <span className="badge badge--plain">{childCount} 子节点</span>}
                  </div>
                </button>
                <button
                  className="row__more"
                  aria-label="更多操作"
                  onClick={() => setActionNode(child)}
                >
                  {childExpanding ? (
                    <Loader2 size={17} className="spin" style={{ color: 'var(--gold-text)' }} />
                  ) : (
                    <MoreHorizontal size={19} />
                  )}
                </button>
                <button
                  className="row__more"
                  aria-label="下钻"
                  onClick={() => {
                    drillTo(child.id)
                    scrollToTop()
                  }}
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            )
          })
        )}

        {/* 展开错误提示 */}
        {expandError && (
          <div className="error-banner">
            {expandError}
            <button className="btn btn--sm btn--ghost" onClick={() => setExpandError(null)}>
              知道了
            </button>
          </div>
        )}
        {batch.error && <div className="error-banner">{batch.error}</div>}
        {modeSwitchError && <div className="error-banner">{modeSwitchError}</div>}
      </div>

      {/* ── 节点操作面板 ── */}
      <ActionSheet
        open={actionNode !== null}
        title={actionNode?.topic}
        desc={actionNode?.description}
        actions={actionNode ? nodeActions(actionNode) : []}
        onClose={() => setActionNode(null)}
      />

      {/* ── 批量生成：启动面板 ── */}
      <BatchStartSheet
        open={batchTarget !== null}
        topic={batchTarget?.topic ?? ''}
        disabled={batch.task?.status === 'running'}
        onClose={() => setBatchTarget(null)}
        onStart={async (layers) => {
          if (!batchTarget) return
          await batch.start(batchTarget.nodeId, layers, selectedModelId ?? undefined)
          setBatchTarget(null)
          setBatchDetailOpen(true)
        }}
      />

      {/* ── 批量生成：浮动进度（进行中/已结束均展示，区别仅在按钮） ── */}
      {batch.task && (
        <BatchPanel
          completed={batch.task.completed_items}
          failed={batch.task.failed_items}
          total={batch.task.total_items}
          status={batch.task.status}
          onOpen={() => setBatchDetailOpen(true)}
          onCancel={() => batch.cancel()}
          onDismiss={() => batch.dismiss()}
        />
      )}

      {/* ── 批量生成：明细面板 ── */}
      {batchDetailOpen && batch.task && (
        <div className="sheet-mask" onClick={() => setBatchDetailOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__handle" />
            <div className="sheet__title">批量生成明细</div>
            <div className="sheet__desc">
              共 {batch.task.total_items} 项 · 完成 {batch.task.completed_items} · 失败{' '}
              {batch.task.failed_items}
            </div>
            <div className="sheet__body">
              {batch.items.map((item) => (
                <div
                  key={item.id}
                  className="flex-between"
                  style={{
                    padding: '10px 4px',
                    borderBottom: '1px solid var(--card-border)',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="text-sm" style={{ fontWeight: 600 }}>
                      {item.type === 'generate_article' ? '📄' : '🌿'}{' '}
                      {item.node_topic || item.parent_topic || `第 ${item.layer} 层`}
                    </div>
                    {item.status === 'failed' && item.error && (
                      <div className="text-xs text-danger" style={{ marginTop: 2 }}>
                        {item.error}
                      </div>
                    )}
                  </div>
                  {item.status === 'completed' && (
                    <CheckCircle2 size={17} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  )}
                  {item.status === 'failed' && (
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => batch.retry(item.id)}
                    >
                      重试
                    </button>
                  )}
                  {item.status === 'running' && (
                    <Loader2 size={16} className="spin" style={{ color: 'var(--gold-text)' }} />
                  )}
                  {item.status === 'pending' && <Clock size={16} className="text-faint" />}
                </div>
              ))}
              {batch.items.length === 0 && (
                <p className="text-center text-sub text-sm" style={{ padding: '24px 0' }}>
                  队列生成中，请稍候...
                </p>
              )}
            </div>
            {batch.task.status === 'running' && (
              <div className="sheet__actions">
                <button className="btn btn--danger btn--block" onClick={() => batch.cancel()}>
                  取消生成
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 删除确认 ── */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />

      {/* ── 模式切换确认 ── */}
      <ConfirmDialog
        open={modeSwitchPending != null}
        title="创建新模式的学习树"
        message={
          modeSwitchError
            ? modeSwitchError
            : `「${treeData.root_topic ?? ''}」还没有${
                modeSwitchPending === 'interview' ? '面试模式' : '理解模式'
              }的树，是否以当前主题创建？（当前处于${
                currentMode === 'interview' ? '面试模式' : '理解模式'
              }）`
        }
        variant="info"
        confirmText={isCreatingMode ? '创建中...' : '创建'}
        onConfirm={handleCreateModeTree}
        onCancel={() => {
          if (!isCreatingMode) {
            setModeSwitchPending(null)
            setModeSwitchError(null)
          }
        }}
      />
    </div>
  )
}
