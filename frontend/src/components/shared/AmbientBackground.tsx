/**
 * 环境光晕背景组件
 * 提供页面底层的渐变光晕效果
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px]"
        style={{ background: 'var(--home-glow-ambient)' }}
      />
      <div
        className="absolute bottom-[-30%] right-[-15%] w-[50vw] h-[50vw] rounded-full blur-[100px]"
        style={{ background: 'var(--home-glow-ambient2)' }}
      />
    </div>
  )
}
