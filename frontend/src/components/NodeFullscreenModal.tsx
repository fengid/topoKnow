import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { nodeApi } from '@/services/api'
import type { Node as NodeType, Article, Question } from '@/types'
import { useUIStore } from '@/store'
import { FullscreenInfoTab, FullscreenArticleTab, FullscreenQuestionsTab } from './fullscreen'
import { NoiseOverlay } from '@/components/shared'

interface NodeFullscreenModalProps {
  nodeId: string | null
  onClose: () => void
}

type TabType = 'info' | 'article' | 'questions'

const luxeEase = [0.22, 1, 0.36, 1] as const

export function NodeFullscreenModal({ nodeId, onClose }: NodeFullscreenModalProps) {
  const { setContextMenuNodeId } = useUIStore()
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const contentRef = useRef<HTMLDivElement>(null)

  const { data: nodeData } = useQuery({
    queryKey: ['node', nodeId],
    queryFn: async () => {
      const response = await nodeApi.getById(nodeId!)
      return response.data.data as NodeType
    },
    enabled: !!nodeId,
    staleTime: Infinity,
  })

  // Prefetch article data only if node has article (skip unnecessary API calls)
  // staleTime: Infinity ensures data stays fresh until explicitly invalidated by mutations
  useQuery({
    queryKey: ['article', nodeId],
    queryFn: async () => {
      const response = await nodeApi.getArticle(nodeId!)
      return response.data.data as Article | null
    },
    enabled: !!nodeId && nodeData?.has_article === true,
    staleTime: Infinity,
  })

  useQuery({
    queryKey: ['questions', nodeId],
    queryFn: async () => {
      const response = await nodeApi.getQuestions(nodeId!)
      return response.data.data as Question[]
    },
    enabled: !!nodeId,
    staleTime: Infinity,
  })

  // Close context menu when opening detail view
  useEffect(() => {
    if (nodeId) {
      setContextMenuNodeId(null)
    }
  }, [nodeId, setContextMenuNodeId])

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent background scroll
  useEffect(() => {
    if (nodeId) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [nodeId])

  if (!nodeId) return null

  const tabs: { id: TabType; label: string }[] = [
    { id: 'info', label: '概览' },
    { id: 'article', label: '文章' },
    { id: 'questions', label: '练习' },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: luxeEase }}
        className="fixed inset-0 z-[9999]"
        style={{ background: 'var(--home-bg)' }}
        onClick={onClose}
      >
        <NoiseOverlay filterId="modal-noise" />

        {/* Ambient gradient mesh — matching HomePage */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px]" style={{ background: 'var(--home-glow-ambient)' }} />
          <div className="absolute bottom-[-25%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[100px]" style={{ background: 'var(--home-glow-ambient2)' }} />
        </div>

        {/* Content shell */}
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: luxeEase }}
          className="relative z-10 h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Header — Navbar-consistent ─── */}
          <header
            className="shrink-0 backdrop-blur-md"
            style={{ borderBottom: '1px solid var(--home-border)' }}
          >
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Left: back + title */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl transition-colors duration-300"
                    style={{ color: 'var(--home-text-sub)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--home-toggle-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    title="返回"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-px h-5" style={{ background: 'var(--home-border)' }} />

                  <h2 className="font-playfair text-lg tracking-tight" style={{ color: 'var(--home-text)' }}>
                    {nodeData?.topic || '加载中...'}
                  </h2>

                  {nodeData?.importance && (
                    <span
                      className="px-2.5 py-0.5 text-[10px] font-outfit font-medium tracking-widest uppercase rounded-full"
                      style={{
                        border: '1px solid rgba(201,169,110,0.2)',
                        background: 'rgba(201,169,110,0.05)',
                        color: 'var(--home-gold-text)',
                      }}
                    >
                      {nodeData.importance === 'high' ? '核心' : nodeData.importance === 'medium' ? '重要' : '基础'}
                    </span>
                  )}
                </div>

                {/* Right: close */}
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl transition-colors duration-300"
                  style={{ color: 'var(--home-text-sub)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--home-toggle-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* ─── Tab Navigation — iOS segmented control ─── */}
          <div
            className="shrink-0 pt-8 pb-2 flex justify-center"
          >
            <div
              className="inline-flex p-1 rounded-2xl"
              style={{
                background: 'var(--home-card-bg)',
                border: '1px solid var(--home-card-border)',
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative px-7 py-2.5 rounded-xl font-outfit text-sm tracking-wide transition-colors duration-300"
                  style={{
                    color: activeTab === tab.id ? 'var(--home-text)' : 'var(--home-text-sub)',
                  }}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'var(--home-toggle-hover)' }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-1/3 right-1/3 h-[2px] rounded-full"
                      style={{ background: 'var(--home-gold-text)' }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ─── Content Area ─── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 py-10">
              <AnimatePresence mode="wait">
                {activeTab === 'info' && (
                  <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <FullscreenInfoTab nodeId={nodeId} />
                  </motion.div>
                )}
                {activeTab === 'article' && (
                  <motion.div key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <FullscreenArticleTab nodeId={nodeId} />
                  </motion.div>
                )}
                {activeTab === 'questions' && (
                  <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <FullscreenQuestionsTab nodeId={nodeId} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
