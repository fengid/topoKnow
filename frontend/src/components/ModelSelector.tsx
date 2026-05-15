import { useEffect } from 'react'
import { useModelStore } from '@/store/modelStore'

interface ModelSelectorProps {
  className?: string
}

export function ModelSelector({ className = '' }: ModelSelectorProps) {
  const { models, selectedModelId, setSelectedModel, loadModels } = useModelStore()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  if (models.length === 0) return null

  return (
    <select
      value={selectedModelId || ''}
      onChange={(e) => setSelectedModel(e.target.value)}
      className={`text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
        px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1
        focus:ring-blue-500 ${className}`}
      aria-label="选择 AI 模型"
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.display_name}
        </option>
      ))}
    </select>
  )
}
