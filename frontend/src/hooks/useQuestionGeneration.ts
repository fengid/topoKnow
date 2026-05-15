import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/services/api'
import { useAIGenerationStore } from '@/store'
import { useModelStore } from '@/store/modelStore'

export function useQuestionGeneration(nodeId: string) {
  const queryClient = useQueryClient()
  const genState = useAIGenerationStore((s) => s.generatingQuestions[nodeId])
  const { startQuestionGeneration, finishQuestionGeneration, failQuestionGeneration, clearQuestionGenerationError } =
    useAIGenerationStore()
  const selectedModelId = useModelStore((s) => s.selectedModelId)

  const isPending = genState?.status === 'pending'
  const isError = genState?.status === 'error'
  const error = genState?.error

  const generate = useCallback(
    async (topic: string) => {
      if (isPending) return
      startQuestionGeneration(nodeId)
      try {
        await nodeApi.generateQuestion(nodeId, topic, selectedModelId ?? undefined)
        finishQuestionGeneration(nodeId)
        queryClient.invalidateQueries({ queryKey: ['questions', nodeId] })
      } catch (err) {
        failQuestionGeneration(nodeId, err instanceof Error ? err.message : '生成失败')
      }
    },
    [nodeId, isPending, startQuestionGeneration, finishQuestionGeneration, failQuestionGeneration, queryClient, selectedModelId]
  )

  const clearError = useCallback(() => {
    clearQuestionGenerationError(nodeId)
  }, [nodeId, clearQuestionGenerationError])

  return { isPending, isError, error, generate, clearError }
}
