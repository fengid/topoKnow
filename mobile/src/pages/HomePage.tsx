import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, ArrowRight, Loader2, Brain, GitBranch, BookOpen } from 'lucide-react'
import TabBar from '../components/TabBar'
import SegmentedControl from '../components/SegmentedControl'
import { treeApi } from '../api/treeApi'
import { extractApiError } from '../utils/error'
import type { TreeMode } from '../types'

const QUICK_TOPICS = [
  '机器学习基础',
  '微积分',
  '量子力学',
  '认知心理学',
  '经济学原理',
  '计算机网络',
  '设计模式',
  '西方哲学史',
]

const FEATURES = [
  {
    icon: Brain,
    title: 'AI 智能规划',
    desc: '大模型深度分析主题，生成个性化知识拓扑',
  },
  {
    icon: GitBranch,
    title: '逐层下钻浏览',
    desc: '面包屑 + 子节点列表，随时展开知识脉络',
  },
  {
    icon: BookOpen,
    title: '深度学习辅助',
    desc: '每个节点可生成学习文章与练习题',
  },
]

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<TreeMode>('understanding')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const createTree = async (topic: string) => {
    const trimmed = topic.trim()
    if (!trimmed || creating) return
    setCreating(true)
    setError('')
    try {
      const res = await treeApi.create(trimmed, mode)
      if (res.data.success && res.data.data) {
        queryClient.invalidateQueries({ queryKey: ['trees'] })
        navigate(`/tree/${res.data.data.id}`)
      } else {
        setError(res.data.error || '创建失败，请稍后重试')
      }
    } catch (err) {
      setError(extractApiError(err, '创建失败，请稍后重试'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page">
      {/* ── Hero ── */}
      <section className="hero fade-in">
        <div className="hero__brand">
          <Sparkles size={13} />
          AI 驱动的知识学习
        </div>
        <h1 className="hero__title">
          构建你的
          <br />
          <em>知识图谱</em>
        </h1>
        <p className="hero__sub">输入学习主题，AI 为你生成结构化知识图谱与学习路径</p>
      </section>

      <div className="page-body">
        {/* ── 模式选择 ── */}
        <SegmentedControl
          options={[
            { value: 'understanding', label: '📖 理解模式' },
            { value: 'interview', label: '💼 面试模式' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {/* ── 主题输入 ── */}
        <div className="mt-12">
          <input
            ref={inputRef}
            className="input"
            placeholder="输入你想学习的主题，如「机器学习基础」"
            enterKeyHint="go"
            onKeyDown={(e) => {
              if (e.key === 'Enter') createTree(inputRef.current?.value ?? '')
            }}
            disabled={creating}
          />
          <button
            className="btn btn--primary btn--block mt-12"
            disabled={creating}
            onClick={() => createTree(inputRef.current?.value ?? '')}
          >
            {creating ? (
              <>
                <Loader2 size={17} className="spin" />
                正在生成知识图谱...
              </>
            ) : (
              <>
                开始学习
                <ArrowRight size={17} />
              </>
            )}
          </button>
          {error && <div className="error-banner">{error}</div>}
        </div>

        {/* ── 快捷主题 ── */}
        <div className="section-title">
          <span className="section-title__text">
            <Sparkles size={14} />
            热门主题
          </span>
        </div>
        <div className="chip-wrap">
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic}
              className="chip"
              disabled={creating}
              onClick={() => createTree(topic)}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* ── 特性 ── */}
        <div className="section-title">
          <span className="section-title__text">
            <GitBranch size={14} />
            核心能力
          </span>
        </div>
        <div className="card" style={{ display: 'grid', gap: 18 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="flex" style={{ gap: 14 }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: 'var(--gold-soft)',
                  color: 'var(--gold-text)',
                  flexShrink: 0,
                }}
              >
                <f.icon size={20} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                  <span className="text-faint" style={{ marginRight: 6, fontWeight: 800 }}>
                    0{i + 1}
                  </span>
                  {f.title}
                </div>
                <div className="text-sub text-sm" style={{ marginTop: 2 }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 统计 ── */}
        <div className="stats">
          <div className="stats__item">
            <div className="stats__value">1000+</div>
            <div className="stats__label">知识节点</div>
          </div>
          <div className="stats__item">
            <div className="stats__value">50+</div>
            <div className="stats__label">学科领域</div>
          </div>
          <div className="stats__item">
            <div className="stats__value">98%</div>
            <div className="stats__label">用户满意度</div>
          </div>
        </div>

        <p className="text-center text-xs text-faint" style={{ marginTop: 24 }}>
          © 2024 TopoKnow · 移动版
        </p>
      </div>

      <TabBar />
    </div>
  )
}
