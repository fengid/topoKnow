import { useThemeStore } from '@/store'

// Ambient Background - 高级感但不干扰阅读
export function AmbientBackground() {
  const { resolvedTheme } = useThemeStore()
  const gridColor = resolvedTheme === 'dark'
    ? 'rgba(10, 132, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.08)'

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 微妙的网格纹理 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(${gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  )
}
