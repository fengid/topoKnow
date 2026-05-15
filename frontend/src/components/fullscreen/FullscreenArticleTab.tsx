import { BookOpen, RefreshCw, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/services/api'
import type { Node as NodeType, Article } from '@/types'
import { MarkdownRenderer, AIGenerateButton } from '@/features/node/components'
import { useArticleGeneration } from '@/hooks/useArticleGeneration'
import { useModelStore } from '@/store/modelStore'

export function FullscreenArticleTab({ nodeId }: { nodeId: string }) {
  const queryClient = useQueryClient()
  const { models, selectedModelId } = useModelStore()

  const { data: node } = useQuery({
    queryKey: ['node', nodeId],
    queryFn: async () => {
      const response = await nodeApi.getById(nodeId)
      return response.data.data as NodeType
    },
    staleTime: Infinity,
  })

  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', nodeId],
    queryFn: async () => {
      const response = await nodeApi.getArticle(nodeId)
      return response.data.data as Article | null
    },
    enabled: !!node?.has_article,
    staleTime: Infinity,
  })

  const { isPending: isGenerating, isError: genError, error: genErrorMessage, generate, regenerate } = useArticleGeneration(nodeId)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await nodeApi.deleteArticle(nodeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] })
    },
  })

  const hasArticle = !!article

  if (isLoadingArticle) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid var(--home-border)', borderTopColor: 'var(--home-gold-text)' }}
          />
          <span className="font-outfit text-sm" style={{ color: 'var(--home-text-sub)' }}>
            加载中...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {!hasArticle ? (
        <div
          className="rounded-2xl py-20 text-center transition-all duration-500"
          style={{
            background: 'var(--glass-bg-light)',
            border: '1px solid var(--glass-border-light)',
          }}
        >
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}
          >
            <BookOpen className="w-7 h-7" style={{ color: 'var(--home-gold-text)' }} />
          </div>
          <h3 className="font-playfair text-xl mb-2" style={{ color: 'var(--home-text)' }}>
            尚未生成知识文章
          </h3>
          <p className="font-outfit text-sm mb-10" style={{ color: 'var(--home-text-sub)' }}>
            让 AI 为您深度解析这个知识点
          </p>
          <div className="flex flex-col items-center gap-2">
            {models.length > 0 && selectedModelId && (
              <p className="text-xs mb-2" style={{ color: 'var(--home-text-sub)' }}>
                当前模型：{models.find(m => m.id === selectedModelId)?.display_name || selectedModelId}
              </p>
            )}
            <AIGenerateButton
              onClick={() => generate(node?.topic ?? '')}
              isLoading={isGenerating}
              label="AI 生成文章"
            />
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl relative transition-all duration-500"
          style={{
            background: 'var(--glass-bg-light)',
            border: '1px solid var(--glass-border-light)',
          }}
        >
          {isGenerating && (
            <div
              className="absolute inset-0 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10"
              style={{ background: 'var(--home-card-bg)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full animate-spin"
                  style={{ border: '2px solid var(--home-border)', borderTopColor: 'var(--home-gold-text)' }}
                />
                <span className="font-outfit text-sm" style={{ color: 'var(--home-text-sub)' }}>
                  正在重新生成...
                </span>
              </div>
            </div>
          )}
          <div className="p-8 pb-0">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.12)' }}
                >
                  <BookOpen className="w-4 h-4" style={{ color: 'var(--home-gold-text)' }} />
                </div>
                <div>
                  <h3 className="font-playfair text-lg" style={{ color: 'var(--home-text)' }}>{article.title}</h3>
                  <p className="font-outfit text-xs mt-0.5" style={{ color: 'var(--home-text-sub)' }}>
                    {new Date(article.updated_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => regenerate(node?.topic ?? '')}
                  disabled={isGenerating || deleteMutation.isPending}
                  className="p-2 rounded-xl transition-all duration-300 disabled:opacity-30"
                  style={{ color: 'var(--home-text-sub)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--home-toggle-hover)'; e.currentTarget.style.color = 'var(--home-gold-text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--home-text-sub)' }}
                  title="重新生成"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={isGenerating || deleteMutation.isPending}
                  className="p-2 rounded-xl transition-all duration-300 disabled:opacity-30"
                  style={{ color: 'var(--home-text-sub)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.06)'; e.currentTarget.style.color = 'var(--ios-accent-red)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--home-text-sub)' }}
                  title="删除文章"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-px" style={{ background: 'var(--home-border)' }} />
          </div>
          <div className="p-8 pt-6">
            <div className="prose dark:prose-invert prose-lg max-w-none font-outfit prose-headings:font-playfair prose-p:leading-[1.8] prose-p:text-[var(--home-text-sub)] prose-headings:text-[var(--home-text)]">
              <MarkdownRenderer content={article.content} />
            </div>
          </div>
        </div>
      )}

      {genError && (
        <p className="text-center font-outfit text-sm" style={{ color: 'var(--ios-accent-red)' }}>
          {genErrorMessage || '生成失败，请稍后重试'}
        </p>
      )}
    </div>
  )
}
