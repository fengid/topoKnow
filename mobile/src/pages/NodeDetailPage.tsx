import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Gauge,
  Layers,
  BookOpen,
  MessageCircle,
  RefreshCw,
  Trash2,
  Sparkles,
  ChevronDown,
  Settings2,
} from 'lucide-react'
import AppBar from '../components/AppBar'
import SegmentedControl from '../components/SegmentedControl'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import Markdown from '../components/Markdown'
import ConfirmDialog from '../components/ConfirmDialog'
import { ImportanceBadge, DifficultyStars } from '../components/Badges'
import { nodeApi } from '../api/nodeApi'
import { questionApi } from '../api/questionApi'
import { useModelStore } from '../store/modelStore'
import { extractApiError } from '../utils/error'
import type { Question } from '../types'

type Tab = 'info' | 'article' | 'questions'

/* ================= 概览 Tab ================= */
function InfoTab() {
  const { id } = useParams<{ id: string }>()
  const { data: node } = useQuery({
    queryKey: ['node', id],
    queryFn: async () => {
      const res = await nodeApi.getById(id!)
      return res.data.data
    },
  })

  if (!node) return null

  return (
    <div className="fade-in">
      <div className="card">
        <div className="text-xs text-sub" style={{ fontWeight: 650, letterSpacing: 1 }}>
          描述
        </div>
        <p style={{ marginTop: 8, lineHeight: 1.8, fontSize: 14.5 }}>
          {node.description || '暂无描述'}
        </p>
      </div>

      <div className="grid-3 mt-12">
        <div className="stats__item">
          <BarChart3 size={17} style={{ color: 'var(--gold-text)', margin: '0 auto 6px' }} />
          <div className="stats__label">重要性</div>
          <ImportanceBadge importance={node.importance} />
        </div>
        <div className="stats__item">
          <Gauge size={17} style={{ color: 'var(--gold-text)', margin: '0 auto 6px' }} />
          <div className="stats__label">难度</div>
          <DifficultyStars level={node.difficulty || 0} />
        </div>
        <div className="stats__item">
          <Layers size={17} style={{ color: 'var(--gold-text)', margin: '0 auto 6px' }} />
          <div className="stats__label">深度</div>
          <div style={{ fontWeight: 750, fontSize: 15 }}>第 {node.depth + 1} 层</div>
        </div>
      </div>
    </div>
  )
}

/* ================= 文章 Tab ================= */
function ArticleTab() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { models, selectedModelId } = useModelStore()
  const [genError, setGenError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: node } = useQuery({
    queryKey: ['node', id],
    queryFn: async () => {
      const res = await nodeApi.getById(id!)
      return res.data.data
    },
  })

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const res = await nodeApi.getArticle(id!)
      return res.data.data
    },
    enabled: !!node?.has_article,
  })

  const [generating, setGenerating] = useState(false)

  const doGenerate = async (regen = false) => {
    if (generating || !node) return
    setGenerating(true)
    setGenError(null)
    try {
      const call = regen ? nodeApi.regenerateArticle : nodeApi.generateArticle
      await call(node.id, node.topic, selectedModelId ?? undefined)
      queryClient.invalidateQueries({ queryKey: ['article', id] })
      queryClient.invalidateQueries({ queryKey: ['node', id] })
    } catch (err) {
      setGenError(extractApiError(err, '生成失败，请稍后重试'))
    } finally {
      setGenerating(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => nodeApi.deleteArticle(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', id] })
      queryClient.invalidateQueries({ queryKey: ['node', id] })
    },
  })

  if (isLoading || (node?.has_article && article === undefined)) {
    return <Loading label="加载文章..." />
  }

  if (!article) {
    return (
      <div className="fade-in">
        <EmptyState
          icon={<BookOpen size={28} />}
          title="尚未生成知识文章"
          desc="让 AI 为你深度解析这个知识点"
          action={
            <div style={{ textAlign: 'center' }}>
              {models.length > 0 && selectedModelId && (
                <p className="text-xs text-faint" style={{ marginBottom: 10 }}>
                  当前模型：{models.find((m) => m.id === selectedModelId)?.display_name}
                </p>
              )}
              <button
                className="btn btn--primary"
                disabled={generating}
                onClick={() => doGenerate(false)}
              >
                {generating ? '正在生成，约需 1-2 分钟...' : 'AI 生成文章'}
              </button>
            </div>
          }
        />
        {genError && <div className="error-banner">{genError}</div>}
      </div>
    )
  }

  return (
    <div className="card fade-in">
      {generating && (
        <div className="loading-center" style={{ padding: '10px 0' }}>
          <div className="spinner" />
          <span className="text-sm">正在重新生成...</span>
        </div>
      )}
      <div className="flex-between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="flex gap-8">
            <span className="row__icon" style={{ width: 34, height: 34 }}>
              <BookOpen size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.4 }}>{article.title}</div>
              <div className="text-xs text-faint" style={{ marginTop: 2 }}>
                {new Date(article.updated_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="flex" style={{ flexShrink: 0 }}>
          <button
            className="row__more"
            aria-label="重新生成"
            disabled={generating}
            onClick={() => doGenerate(true)}
          >
            <RefreshCw size={17} />
          </button>
          <button
            className="row__more"
            aria-label="删除文章"
            style={{ color: 'var(--danger)' }}
            disabled={generating}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: 'var(--card-border)',
          margin: '14px 0',
        }}
      />
      <Markdown content={article.content} />

      {genError && <div className="error-banner">{genError}</div>}

      <ConfirmDialog
        open={confirmDelete}
        title="删除文章"
        message="确定要删除这篇文章吗？删除后可重新生成。"
        onConfirm={() => {
          deleteMutation.mutate()
          setConfirmDelete(false)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

/* ================= 练习 Tab ================= */
function QuestionCard({
  question,
  index,
  onDelete,
  deleting,
}: {
  question: Question
  index: number
  onDelete: () => void
  deleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        className="flex-between"
        style={{ width: '100%', padding: '14px 16px', textAlign: 'left', gap: 10 }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ minWidth: 0 }}>
          <span className="badge badge--gold" style={{ marginBottom: 6 }}>
            Q{index + 1}
          </span>
          <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.6 }}>
            {question.question}
          </div>
        </div>
        <ChevronDown
          size={18}
          className="text-sub"
          style={{
            flexShrink: 0,
            transition: 'transform 0.25s',
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ height: 1, background: 'var(--card-border)', marginBottom: 12 }} />
          <Markdown content={question.answer} />
          <div className="flex-between mt-12">
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              {question.tags?.slice(0, 4).map((tag) => (
                <span key={tag} className="badge badge--plain">
                  {tag}
                </span>
              ))}
            </div>
            <button
              className="row__more"
              aria-label="删除题目"
              style={{ color: 'var(--danger)' }}
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionsTab() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { models, selectedModelId } = useModelStore()
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const { data: node } = useQuery({
    queryKey: ['node', id],
    queryFn: async () => {
      const res = await nodeApi.getById(id!)
      return res.data.data
    },
  })

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', id],
    queryFn: async () => {
      const res = await nodeApi.getQuestions(id!)
      return res.data.data ?? []
    },
  })

  const generate = async () => {
    if (generating || !node) return
    setGenerating(true)
    setGenError(null)
    try {
      await nodeApi.generateQuestion(node.id, node.topic, selectedModelId ?? undefined)
      queryClient.invalidateQueries({ queryKey: ['questions', id] })
      queryClient.invalidateQueries({ queryKey: ['node', id] })
    } catch (err) {
      setGenError(extractApiError(err, '生成失败，请稍后重试'))
    } finally {
      setGenerating(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => questionApi.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', id] })
      queryClient.invalidateQueries({ queryKey: ['node', id] })
    },
  })

  if (isLoading) return <Loading label="加载练习题..." />

  const list = questions ?? []

  return (
    <div className="fade-in">
      {list.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={28} />}
          title="暂无练习题"
          desc="让 AI 为你生成这个知识点的练习题"
          action={
            <div>
              {models.length > 0 && selectedModelId && (
                <p className="text-xs text-faint" style={{ marginBottom: 10 }}>
                  当前模型：{models.find((m) => m.id === selectedModelId)?.display_name}
                </p>
              )}
              <button className="btn btn--primary" disabled={generating} onClick={generate}>
                {generating ? '正在生成...' : 'AI 生成练习题'}
              </button>
            </div>
          }
        />
      ) : (
        <>
          {list.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              deleting={deleteMutation.isPending}
              onDelete={() => deleteMutation.mutate(q.id)}
            />
          ))}
          <button className="btn btn--gold btn--block mt-12" disabled={generating} onClick={generate}>
            <Sparkles size={16} />
            {generating ? '正在生成...' : '继续生成练习题'}
          </button>
        </>
      )}
      {genError && <div className="error-banner">{genError}</div>}
    </div>
  )
}

/* ================= 主页面 ================= */
export default function NodeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: node, isLoading } = useQuery({
    queryKey: ['node', id],
    queryFn: async () => {
      const res = await nodeApi.getById(id!)
      return res.data.data
    },
  })
  const [tab, setTab] = useState<Tab>('info')

  return (
    <div className="page page--immersive">
      <AppBar
        onBack={() => navigate(-1)}
        title={
          <>
            <span className="ellipsis">{node?.topic || '节点详情'}</span>
            {node && <ImportanceBadge importance={node.importance} />}
          </>
        }
        right={
          <button className="appbar__btn" aria-label="模型设置" onClick={() => navigate('/settings')}>
            <Settings2 size={18} />
          </button>
        }
      />

      <div className="page-body">
        <SegmentedControl
          options={[
            { value: 'info', label: '概览' },
            { value: 'article', label: '文章' },
            { value: 'questions', label: '练习' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <div className="mt-16">
          {isLoading ? (
            <Loading />
          ) : !node ? (
            <EmptyState
              icon={<MessageCircle size={26} />}
              title="节点不存在或已删除"
              action={
                <button className="btn btn--ghost" onClick={() => navigate(-1)}>
                  返回
                </button>
              }
            />
          ) : (
            <>
              {tab === 'info' && <InfoTab />}
              {tab === 'article' && <ArticleTab />}
              {tab === 'questions' && <QuestionsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
