import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: ThemeMode): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#141210' : '#faf8f4')
}

const stored = (localStorage.getItem('topoknow-mobile-theme') as ThemeMode | null) || 'system'

applyTheme(resolve(stored))

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: stored,
  resolvedTheme: resolve(stored),
  setTheme: (theme) => {
    const resolved = resolve(theme)
    localStorage.setItem('topoknow-mobile-theme', theme)
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })
  },
}))

// 跟随系统模式下，监听系统主题变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const state = useThemeStore.getState()
  if (state.theme === 'system') {
    const resolved = systemTheme()
    applyTheme(resolved)
    useThemeStore.setState({ resolvedTheme: resolved })
  }
})
