import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModelStore } from '@/store/modelStore'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { models, selectedModelId, setSelectedModel, loadModels } = useModelStore()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  return (
    <div className="min-h-screen" style={{ background: 'var(--home-bg)', color: 'var(--home-text)' }}>
      <Navbar subtitle="模型设置" />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl transition-colors duration-300"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--home-toggle-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--home-text-sub)' }} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">AI 模型设置</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--home-text-sub)' }}>
              选择用于生成内容的 AI 模型
            </p>
          </div>
        </div>

        {models.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--home-text-sub)' }}>加载中...</p>
        ) : (
          <div className="grid gap-3">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className="w-full text-left p-4 rounded-xl border-2 transition-all duration-200"
                style={{
                  borderColor: selectedModelId === model.id
                    ? 'var(--gold, #D4A853)'
                    : 'var(--home-border)',
                  background: selectedModelId === model.id
                    ? 'var(--home-toggle-hover)'
                    : 'transparent',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{model.display_name}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--home-text-sub)' }}>
                      {model.provider.toUpperCase()}
                    </div>
                  </div>
                  {selectedModelId === model.id && (
                    <span className="text-sm font-medium" style={{ color: 'var(--gold, #D4A853)' }}>
                      ✓ 当前使用
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
