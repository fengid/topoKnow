import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Cpu, Palette, Info, Smartphone } from 'lucide-react'
import TabBar from '../components/TabBar'
import AppBar from '../components/AppBar'
import SegmentedControl from '../components/SegmentedControl'
import { useModelStore } from '../store/modelStore'
import { useThemeStore } from '../store/themeStore'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { models, selectedModelId, setSelectedModel, loadModels, isLoaded } = useModelStore()
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  return (
    <div className="page">
      <AppBar title="设置" />

      <div className="page-body">
        {/* ── AI 模型 ── */}
        <div className="section-title" style={{ marginTop: 8 }}>
          <span className="section-title__text">
            <Cpu size={14} />
            AI 模型
          </span>
        </div>

        {!isLoaded || models.length === 0 ? (
          <div className="card text-center text-sub text-sm" style={{ padding: '28px 16px' }}>
            {isLoaded ? '暂无可用模型，请检查后端 AI 配置' : '正在加载模型列表...'}
          </div>
        ) : (
          models.map((model) => {
            const active = selectedModelId === model.id
            return (
              <button
                key={model.id}
                className="row"
                style={{
                  marginBottom: 10,
                  borderColor: active ? 'var(--gold-border)' : undefined,
                  background: active ? 'var(--gold-soft)' : undefined,
                }}
                onClick={() => setSelectedModel(model.id)}
              >
                <span className="row__icon">
                  <Cpu size={17} />
                </span>
                <div className="row__main">
                  <div className="row__title" style={{ WebkitLineClamp: 1 }}>
                    {model.display_name}
                  </div>
                  <div className="row__meta">
                    <span className="badge badge--plain">{model.provider.toUpperCase()}</span>
                    {active && <span className="badge badge--gold">当前使用</span>}
                  </div>
                </div>
                {active && (
                  <Check size={19} style={{ color: 'var(--gold-text)', flexShrink: 0 }} />
                )}
              </button>
            )
          })
        )}

        {/* ── 外观 ── */}
        <div className="section-title">
          <span className="section-title__text">
            <Palette size={14} />
            外观
          </span>
        </div>
        <div className="card">
          <div className="text-sm" style={{ fontWeight: 650, marginBottom: 10 }}>
            主题模式
          </div>
          <SegmentedControl
            options={[
              { value: 'light', label: '☀️ 浅色' },
              { value: 'dark', label: '🌙 深色' },
              { value: 'system', label: '⚙️ 跟随系统' },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>

        {/* ── 关于 ── */}
        <div className="section-title">
          <span className="section-title__text">
            <Info size={14} />
            关于
          </span>
        </div>
        <div className="card">
          <div className="flex gap-10">
            <span className="row__icon">
              <Smartphone size={17} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>TopoKnow 移动版</div>
              <p className="text-sub text-sm" style={{ marginTop: 2 }}>
                AI 知识拓扑学习平台 · 为移动浏览优化，支持知识树下钻浏览、文章阅读与练习
              </p>
            </div>
          </div>
          <div
            style={{
              height: 1,
              background: 'var(--card-border)',
              margin: '14px 0',
            }}
          />
          <button
            className="btn btn--ghost btn--sm"
            style={{ width: '100%' }}
            onClick={() => navigate('/')}
          >
            返回首页
          </button>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
