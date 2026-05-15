import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIModel } from '@/types'
import { modelApi } from '@/services/api'

interface ModelState {
  models: AIModel[]
  defaultModelId: string | null
  selectedModelId: string | null
  isLoaded: boolean
  setModels: (models: AIModel[], defaultId: string) => void
  setSelectedModel: (id: string) => void
  loadModels: () => Promise<void>
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
        const isValid = current && models.some((m) => m.id === current)
        set({
          models,
          defaultModelId: defaultId,
          selectedModelId: isValid ? current : defaultId,
          isLoaded: true,
        })
      },

      setSelectedModel: (id) => set({ selectedModelId: id }),

      loadModels: async () => {
        if (get().isLoaded) return
        try {
          const res = await modelApi.getModels()
          const data = res.data.data
          if (data) {
            get().setModels(data.models, data.default_model)
          }
        } catch {
          // silent fail
        }
      },
    }),
    {
      name: 'ai-model-selection',
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
      }),
    }
  )
)
