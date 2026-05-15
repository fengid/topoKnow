import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/services/api'
import { useAIGenerationStore } from '@/store'
import { useModelStore } from '@/store/modelStore'

export function useArticleGeneration(nodeId: string) {
  const queryClient = useQueryClient()
  const genState = useAIGenerationStore((s) => s.generatingArticles[nodeId])
  const { startArticleGeneration, finishArticleGeneration, failArticleGeneration, clearArticleGenerationError } =
    useAIGenerationStore()
  const selectedModelId = useModelStore((s) => s.selectedModelId)

  const isPending = genState?.status === 'pending'
  const isError = genState?.status === 'error'
  const error = genState?.error

  const generate = useCallback(
    async (topic: string) => {
      if (isPending) return
      startArticleGeneration(nodeId)
      try {
        await nodeApi.generateArticle(nodeId, topic, selectedModelId ?? undefined)
        finishArticleGeneration(nodeId)
        queryClient.invalidateQueries({ queryKey: ['article', nodeId] })
        queryClient.invalidateQueries({ queryKey: ['node', nodeId] })
      } catch (err) {
        failArticleGeneration(nodeId, err instanceof Error ? err.message : '生成失败')
      }
    },
    [nodeId, isPending, startArticleGeneration, finishArticleGeneration, failArticleGeneration, queryClient, selectedModelId]
  )

  const regenerate = useCallback(
    async (topic: string) => {
      if (isPending) return
      startArticleGeneration(nodeId)
      try {
        await nodeApi.regenerateArticle(nodeId, topic, selectedModelId ?? undefined)
        finishArticleGeneration(nodeId)
        queryClient.invalidateQueries({ queryKey: ['article', nodeId] })
        queryClient.invalidateQueries({ queryKey: ['node', nodeId] })
      } catch (err) {
        failArticleGeneration(nodeId, err instanceof Error ? err.message : '重新生成失败')
      }
    },
    [nodeId, isPending, startArticleGeneration, finishArticleGeneration, failArticleGeneration, queryClient, selectedModelId]
  )

  const clearError = useCallback(() => {
    clearArticleGenerationError(nodeId)
  }, [nodeId, clearArticleGenerationError])

  return { isPending, isError, error, generate, regenerate, clearError }
}
