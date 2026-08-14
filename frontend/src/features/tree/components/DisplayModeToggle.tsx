import { useThemeStore } from '@/store'

export type DisplayMode = 'tree' | 'rows'

const MODES: Array<[DisplayMode, string]> = [
  ['tree', '树状'],
  ['rows', '行式'],
]

/** 展示模式开关：树状（dagre）/ 行式（按层靠左） */
export function DisplayModeToggle({
  mode,
  onChange,
}: {
  mode: DisplayMode
  onChange: (mode: DisplayMode) => void
}) {
  const { resolvedTheme } = useThemeStore()

  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <div
        className="flex items-center gap-1 p-1 rounded-xl"
        style={{
          background: resolvedTheme === 'dark' ? 'rgba(20, 20, 20, 0.85)' : 'rgba(250, 250, 248, 0.88)',
          border: '1px solid var(--home-card-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {MODES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => onChange(value)}
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
    </div>
  )
}
