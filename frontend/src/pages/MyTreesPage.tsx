import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, RefreshCw, GitBranch } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { treeApi } from '@/services/api'
import Navbar from '@/components/Navbar'
import { NoiseOverlay, AmbientBackground } from '@/components/shared'

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } },
  item: { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } },
}

const cardHoverAnimation = {
  scale: 1.02,
  y: -4,
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
    mass: 0.8
  }
}

const cardTapAnimation = {
  scale: 0.98,
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 25
  }
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MyTreesPage() {
  const navigate = useNavigate()

  const { data: trees, isLoading, isError, refetch } = useQuery({
    queryKey: ['trees'],
    queryFn: async () => {
      const res = await treeApi.getAll()
      return res.data.data ?? []
    },
    staleTime: 1000 * 60 * 2,
  })

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--home-bg)', color: 'var(--home-text)' }}
    >
      <NoiseOverlay filterId="noise-trees" />
      <AmbientBackground />

      {/* ─── Header ─── */}
      <Navbar />

      {/* ─── Content ─── */}
      <main className="relative z-10 py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          {/* Editorial divider title */}
          <motion.div
            className="flex items-center gap-6 mb-14"
            variants={stagger.item}
            initial="hidden"
            animate="visible"
          >
            <div className="flex-1 h-px" style={{ backgroundImage: 'linear-gradient(to right, transparent, rgba(201,169,110,0.3))' }} />
            <h1 className="font-playfair text-2xl sm:text-3xl tracking-wide whitespace-nowrap" style={{ color: 'var(--home-text)' }}>
              我的<span className="font-bold italic" style={{ color: 'var(--home-gold-text)' }}>知识图谱</span>
            </h1>
            <div className="flex-1 h-px" style={{ backgroundImage: 'linear-gradient(to left, transparent, rgba(201,169,110,0.3))' }} />
          </motion.div>

          {isLoading ? (
            /* Skeleton cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="relative p-6 rounded-2xl animate-pulse"
                  style={{ background: 'var(--home-card-bg)', border: '1px solid var(--home-card-border)', height: '120px' }}
                >
                  <div className="h-4 w-3/4 rounded" style={{ background: 'var(--home-border)' }} />
                  <div className="h-3 w-1/3 rounded mt-4" style={{ background: 'var(--home-border)' }} />
                </div>
              ))}
            </div>
          ) : isError ? (
            /* Error state */
            <motion.div
              className="flex flex-col items-center py-20"
              variants={stagger.item}
              initial="hidden"
              animate="visible"
            >
              <p className="font-playfair text-lg mb-4" style={{ color: 'var(--home-text-sub)' }}>
                加载失败，请重试
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-outfit text-sm transition-all duration-300 hover:brightness-110 active:scale-95"
                style={{ background: 'var(--home-card-bg)', border: '1px solid var(--home-card-border)', color: 'var(--home-text)' }}
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
            </motion.div>
          ) : !trees || trees.length === 0 ? (
            /* Empty state */
            <motion.div
              className="flex flex-col items-center py-20"
              variants={stagger.item}
              initial="hidden"
              animate="visible"
            >
              <GitBranch className="w-14 h-14 mb-5" style={{ color: 'rgba(201,169,110,0.25)' }} />
              <p className="font-playfair text-xl mb-2" style={{ color: 'var(--home-text-sub)' }}>
                还没有知识图谱
              </p>
              <p className="font-outfit text-sm mb-8" style={{ color: 'var(--home-text-sub)', opacity: 0.6 }}>
                输入一个学习主题，开始构建你的第一棵知识树
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-gold to-gold-dark font-outfit font-medium rounded-xl hover:brightness-110 transition-all duration-300 active:scale-95"
                style={{ color: 'var(--home-btn-text)' }}
              >
                前往首页创建
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            /* Tree card grid */
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              initial="hidden"
              animate="visible"
              variants={stagger.container}
            >
              {trees.map((tree: { id: string | number; root_topic?: string; created_at?: string }) => (
                <motion.div
                  key={tree.id}
                  variants={stagger.item}
                  whileHover={cardHoverAnimation}
                  whileTap={cardTapAnimation}
                  onClick={() => navigate(`/tree/${tree.id}`)}
                  className="group relative p-5 rounded-2xl cursor-pointer transition-[border-color,box-shadow] duration-500"
                  style={{ background: 'var(--home-card-bg)', border: '1px solid var(--home-card-border)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(201,169,110,0.3)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,169,110,0.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--home-card-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <GitBranch className="absolute top-5 left-5 w-5 h-5" style={{ color: 'rgba(201,169,110,0.2)' }} />
                  <div className="flex items-start justify-between pl-7">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-playfair text-lg truncate" style={{ color: 'var(--home-text)' }}>
                        {tree.root_topic || '未命名'}
                      </h3>
                      {tree.created_at && (
                        <p className="font-outfit text-xs mt-2" style={{ color: 'var(--home-text-sub)', opacity: 0.5 }}>
                          {formatDate(tree.created_at)}
                        </p>
                      )}
                    </div>
                    <ArrowRight
                      className="w-4 h-4 mt-1 flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300"
                      style={{ color: 'var(--home-gold-text)' }}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8" style={{ borderTop: '1px solid var(--home-border-light)' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <p className="font-outfit text-xs" style={{ color: 'var(--home-footer-text)' }}>© 2024 TopoKnow</p>
          <div className="flex items-center gap-5">
            <a href="#" className="font-outfit text-xs transition-colors" style={{ color: 'var(--home-footer-text)' }}>GitHub</a>
            <a href="#" className="font-outfit text-xs transition-colors" style={{ color: 'var(--home-footer-text)' }}>文档</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
