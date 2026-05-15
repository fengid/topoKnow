import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ChevronDown, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nodeApi, questionApi } from '@/services/api'
import type { Node as NodeType, Question } from '@/types'
import { MarkdownRenderer, AIGenerateButton } from '@/features/node/components'
import { useQuestionGeneration } from '@/hooks/useQuestionGeneration'
import { useModelStore } from '@/store/modelStore'

const luxeEase = [0.22, 1, 0.36, 1] as const

export function FullscreenQuestionsTab({ nodeId }: { nodeId: string }) {
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

  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['questions', nodeId],
    queryFn: async () => {
      const response = await nodeApi.getQuestions(nodeId)
      return response.data.data as Question[]
    },
    staleTime: Infinity,
  })

  const { isPending: isGenerating, isError: genError, error: genErrorMessage, generate } = useQuestionGeneration(nodeId)

  const deleteMutation = useMutation({
    mutationFn: async (questionId: string) => {
      await questionApi.delete(questionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', nodeId] })
    },
  })

  const questionsList = questions || []
  const hasQuestions = questionsList.length > 0

  if (isLoadingQuestions) {
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
    <div className="space-y-6">
      {!hasQuestions && !isLoadingQuestions ? (
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
            <MessageCircle className="w-7 h-7" style={{ color: 'var(--home-gold-text)' }} />
          </div>
          <h3 className="font-playfair text-xl mb-2" style={{ color: 'var(--home-text)' }}>
            暂无练习题
          </h3>
          <p className="font-outfit text-sm mb-10" style={{ color: 'var(--home-text-sub)' }}>
            让 AI 为您生成这个知识点的练习题
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
              label="AI 生成练习题"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questionsList.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              onDelete={() => deleteMutation.mutate(question.id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
          <div className="pt-3 flex flex-col justify-center items-center gap-2">
            {models.length > 0 && selectedModelId && (
              <p className="text-xs mb-2" style={{ color: 'var(--home-text-sub)' }}>
                当前模型：{models.find(m => m.id === selectedModelId)?.display_name || selectedModelId}
              </p>
            )}
            <AIGenerateButton
              onClick={() => generate(node?.topic ?? '')}
              isLoading={isGenerating}
              label="继续生成练习题"
            />
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

function QuestionCard({
  question,
  index,
  onDelete,
  isDeleting,
}: {
  question: Question
  index: number
  onDelete: () => void
  isDeleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-2xl transition-all duration-500 overflow-hidden"
      style={{
        background: 'var(--glass-bg-light)',
        border: `1px solid ${expanded ? 'rgba(201,169,110,0.15)' : 'var(--glass-border-light)'}`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-4 text-left group p-6"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className="font-outfit text-[10px] font-medium tracking-widest uppercase px-2.5 py-0.5 rounded-full"
              style={{
                border: '1px solid rgba(201,169,110,0.2)',
                background: 'rgba(201,169,110,0.05)',
                color: 'var(--home-gold-text)',
              }}
            >
              Q{index + 1}
            </span>
          </div>
          <p
            className="font-outfit text-base leading-relaxed transition-colors duration-300"
            style={{ color: 'var(--home-text)' }}
          >
            {question.question}
          </p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: luxeEase }}
          className="p-1.5 rounded-lg shrink-0 mt-1"
          style={{ color: 'var(--home-text-sub)' }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: luxeEase }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <div className="h-px mb-5" style={{ background: 'var(--home-border)' }} />
              <div className="prose dark:prose-invert prose-sm max-w-none mb-5 font-outfit prose-p:leading-[1.8] prose-p:text-[var(--home-text-sub)]">
                <MarkdownRenderer content={question.answer} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {question.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 font-outfit text-xs rounded-lg"
                      style={{
                        color: 'var(--home-text-sub)',
                        border: '1px solid var(--home-border)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  disabled={isDeleting}
                  className="p-2 rounded-xl transition-all duration-300 disabled:opacity-30"
                  style={{ color: 'var(--home-text-sub)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.06)'; e.currentTarget.style.color = 'var(--ios-accent-red)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--home-text-sub)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
