import { useStore } from 'reactflow'
import { useThemeStore } from '@/store'

/**
 * 画布缩放比例指示器（左下角）
 * 必须作为 <ReactFlow> 的子组件渲染（与 Background 一致），
 * 因为 useStore 订阅的是 React Flow Provider 内部的画布状态
 */
export function ZoomIndicator() {
  const { resolvedTheme } = useThemeStore()
  const zoom = useStore((s) => s.transform[2])
  const percent = Math.round(zoom * 100)

  return (
    <div className="absolute bottom-5 left-5 z-[1000] pointer-events-none">
      <div
        className="px-3 py-1.5 rounded-xl font-outfit text-xs tabular-nums select-none"
        style={{
          background: resolvedTheme === 'dark' ? 'rgba(20, 20, 20, 0.85)' : 'rgba(250, 250, 248, 0.88)',
          border: '1px solid var(--home-card-border)',
          color: 'var(--home-text-sub)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        title="画布缩放比例"
      >
        {percent}%
      </div>
    </div>
  )
}
