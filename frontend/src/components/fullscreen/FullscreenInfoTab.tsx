import { Layers, BarChart3, Gauge } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { nodeApi } from '@/services/api'
import type { Node as NodeType } from '@/types'

export function FullscreenInfoTab({ nodeId }: { nodeId: string }) {
  const { data: node, isLoading } = useQuery({
    queryKey: ['node', nodeId],
    queryFn: async () => {
      const response = await nodeApi.getById(nodeId)
      return response.data.data as NodeType
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid var(--home-border)', borderTopColor: 'var(--home-gold-text)' }}
          />
          <span className="font-outfit text-sm" style={{ color: 'var(--home-text-sub)' }}>
            加载中...
          </span>
        </div>
      </div>
    )
  }

  if (!node) return null

  const difficultyStars = Array.from({ length: 5 }, (_, i) => i < (node.difficulty || 0))

  const importanceConfig = {
    high: { label: '高', color: 'var(--ios-accent-red)' },
    medium: { label: '中', color: 'var(--ios-accent-orange)' },
    low: { label: '低', color: 'var(--ios-accent-green)' },
  }
  const importance = importanceConfig[node.importance as keyof typeof importanceConfig] ?? { label: '未知', color: 'var(--home-text-sub)' }

  return (
    <div className="space-y-8">
      {/* Description */}
      <div
        className="rounded-2xl p-8 transition-all duration-500"
        style={{
          background: 'var(--glass-bg-light)',
          border: '1px solid var(--glass-border-light)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.15)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg-light)'; e.currentTarget.style.borderColor = 'var(--glass-border-light)' }}
      >
        <span className="font-playfair text-sm" style={{ color: 'var(--home-text-sub)' }}>描述</span>
        <p className="font-outfit text-base leading-[1.8] mt-3" style={{ color: 'var(--home-text)' }}>
          {node.description || '暂无描述'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Importance */}
        <div
          className="rounded-2xl p-6 text-center transition-all duration-500"
          style={{
            background: 'var(--glass-bg-light)',
            border: '1px solid var(--glass-border-light)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg-light)'; e.currentTarget.style.borderColor = 'var(--glass-border-light)' }}
        >
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
          >
            <BarChart3 className="w-4.5 h-4.5" style={{ color: 'var(--home-gold-text)' }} />
          </div>
          <p className="font-outfit text-xs mb-1.5" style={{ color: 'var(--home-text-sub)' }}>重要性</p>
          <p className="font-playfair text-lg font-bold" style={{ color: importance.color }}>
            {importance.label}
          </p>
        </div>

        {/* Difficulty */}
        <div
          className="rounded-2xl p-6 text-center transition-all duration-500"
          style={{
            background: 'var(--glass-bg-light)',
            border: '1px solid var(--glass-border-light)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg-light)'; e.currentTarget.style.borderColor = 'var(--glass-border-light)' }}
        >
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
          >
            <Gauge className="w-4.5 h-4.5" style={{ color: 'var(--home-gold-text)' }} />
          </div>
          <p className="font-outfit text-xs mb-1.5" style={{ color: 'var(--home-text-sub)' }}>难度</p>
          <div className="flex justify-center gap-1">
            {difficultyStars.map((filled, i) => (
              <span
                key={i}
                className="text-base"
                style={{ color: filled ? 'var(--home-gold-text)' : 'var(--home-text-muted)' }}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Depth */}
        <div
          className="rounded-2xl p-6 text-center transition-all duration-500"
          style={{
            background: 'var(--glass-bg-light)',
            border: '1px solid var(--glass-border-light)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg-light)'; e.currentTarget.style.borderColor = 'var(--glass-border-light)' }}
        >
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
          >
            <Layers className="w-4.5 h-4.5" style={{ color: 'var(--home-gold-text)' }} />
          </div>
          <p className="font-outfit text-xs mb-1.5" style={{ color: 'var(--home-text-sub)' }}>深度</p>
          <p className="font-playfair text-lg font-bold" style={{ color: 'var(--home-text)' }}>
            第 {node.depth + 1} 层
          </p>
        </div>
      </div>
    </div>
  )
}
