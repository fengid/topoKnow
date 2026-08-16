import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { modelApi } from '../api/modelApi'
import type { AIModel } from '../types'

interface ModelState {
  models: AIModel[]
  defaultModelId: string | null
  selectedModelId: string | null
  isLoaded: boolean
  setModels: (models: AIModel[], defaultId: string) => void
  setSelectedModel: (id: string) => void
  loadModels: (force?: boolean) => Promise<void>
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [],
      defaultModelId: null,
      selectedModelId: null,
      isLoaded: false,

      setModels: (models, defaultId) => {
        const current = get().selectedModelId
        const stillValid = current && models.some((m) => m.id === current)
        set({
          models,
          defaultModelId: defaultId,
          selectedModelId: stillValid ? current : defaultId,
          isLoaded: true,
        })
      },

      setSelectedModel: (id) => set({ selectedModelId: id }),

      loadModels: async (force = false) => {
        if (get().isLoaded && !force) return
        try {
          const res = await modelApi.getModels()
          const data = res.data.data
          if (data) get().setModels(data.models, data.default_model)
        } catch {
          // 静默失败，设置页会显示空态
        }
      },
    }),
    {
      name: 'topoknow-mobile-model',
      partialize: (state) => ({ selectedModelId: state.selectedModelId }),
    },
  ),
)
