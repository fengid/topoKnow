import { useThemeStore } from '@/store'
import type { TreeMode } from '@/types'

export const TREE_MODES: Array<{ value: TreeMode; label: string; hint: string }> = [
  { value: 'understanding', label: '理解模式', hint: '按知识体系划分，系统学习' },
  { value: 'interview', label: '面试模式', hint: '按面试问题域划分，高效背诵' },
]

/** 树的模式切换（模式是树的属性：首页用于创建时选择，画布用于切换同主题另一模式的树） */
export function TreeModeToggle({
  mode,
  onChange,
  disabled = false,
}: {
  mode: TreeMode
  onChange: (mode: TreeMode) => void
  disabled?: boolean
}) {
  const { resolvedTheme } = useThemeStore()

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{
        background: resolvedTheme === 'dark' ? 'rgba(20, 20, 20, 0.85)' : 'rgba(250, 250, 248, 0.88)',
        border: '1px solid var(--home-card-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {TREE_MODES.map(({ value, label, hint }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          title={hint}
          className="px-3 py-1.5 rounded-lg text-xs font-outfit transition-all duration-200"
          style={
            mode === value
              ? {
                  background: 'rgba(201, 169, 110, 0.18)',
                  color: 'var(--home-text)',
                  border: '1px solid rgba(201, 169, 110, 0.5)',
                }
              : {
                  color: 'var(--home-text-sub)',
                  border: '1px solid transparent',
                }
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
