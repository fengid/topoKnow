import { create } from 'zustand'

// ==================== Theme Store ====================
type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const storedTheme = (typeof window !== 'undefined'
  ? localStorage.getItem('theme') as ThemeMode | null
  : null) || 'system'

const initialResolved = resolveTheme(storedTheme)
applyTheme(initialResolved)

export const useThemeStore = create<ThemeState>()((set) => {
  // 监听系统主题变化
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const state = useThemeStore.getState()
      if (state.theme === 'system') {
        const resolved = getSystemTheme()
        applyTheme(resolved)
        set({ resolvedTheme: resolved })
      }
    })
  }

  return {
    theme: storedTheme,
    resolvedTheme: initialResolved,
    setTheme: (theme) => {
      const resolved = resolveTheme(theme)
      applyTheme(resolved)
      localStorage.setItem('theme', theme)
      set({ theme, resolvedTheme: resolved })
    },
  }
})

interface GenerationEntry {
  status: 'pending' | 'error'
  error?: string
}

interface AIGenerationState {
  generatingArticles: Record<string, GenerationEntry>
  generatingQuestions: Record<string, GenerationEntry>
  startArticleGeneration: (nodeId: string) => void
  finishArticleGeneration: (nodeId: string) => void
  failArticleGeneration: (nodeId: string, error: string) => void
  clearArticleGenerationError: (nodeId: string) => void
  startQuestionGeneration: (nodeId: string) => void
  finishQuestionGeneration: (nodeId: string) => void
  failQuestionGeneration: (nodeId: string, error: string) => void
  clearQuestionGenerationError: (nodeId: string) => void
}

export const useAIGenerationStore = create<AIGenerationState>()((set) => ({
  generatingArticles: {},
  generatingQuestions: {},
  startArticleGeneration: (nodeId) =>
    set((state) => ({
      generatingArticles: {
        ...state.generatingArticles,
        [nodeId]: { status: 'pending' },
      },
    })),
  finishArticleGeneration: (nodeId) =>
    set((state) => {
      const { [nodeId]: _, ...rest } = state.generatingArticles
      return { generatingArticles: rest }
    }),
  failArticleGeneration: (nodeId, error) =>
    set((state) => ({
      generatingArticles: {
        ...state.generatingArticles,
        [nodeId]: { status: 'error', error },
      },
    })),
  clearArticleGenerationError: (nodeId) =>
    set((state) => {
      const { [nodeId]: _, ...rest } = state.generatingArticles
      return { generatingArticles: rest }
    }),
  startQuestionGeneration: (nodeId) =>
    set((state) => ({
      generatingQuestions: {
        ...state.generatingQuestions,
        [nodeId]: { status: 'pending' },
      },
    })),
  finishQuestionGeneration: (nodeId) =>
    set((state) => {
      const { [nodeId]: _, ...rest } = state.generatingQuestions
      return { generatingQuestions: rest }
    }),
  failQuestionGeneration: (nodeId, error) =>
    set((state) => ({
      generatingQuestions: {
        ...state.generatingQuestions,
        [nodeId]: { status: 'error', error },
      },
    })),
  clearQuestionGenerationError: (nodeId) =>
    set((state) => {
      const { [nodeId]: _, ...rest } = state.generatingQuestions
      return { generatingQuestions: rest }
    }),
}))

interface UIState {
  contextMenuNodeId: string | null
  setContextMenuNodeId: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  (set) => ({
    contextMenuNodeId: null,
    setContextMenuNodeId: (id) => set({ contextMenuNodeId: id }),
  })
)
