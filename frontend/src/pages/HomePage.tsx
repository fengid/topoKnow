import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { treeApi } from '@/services/api'
import Navbar from '@/components/Navbar'
import { NoiseOverlay, AmbientBackground } from '@/components/shared'

/* ─── Floating particle node ─── */
function FloatingNode({ label, x, y, delay }: { label: string; x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 0.5, 0.3], scale: [0.6, 1, 0.9], y: [0, -12, 0] }}
      transition={{ duration: 6, delay, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    >
      <div
        className="px-3 py-1.5 rounded-full text-xs font-outfit tracking-wide"
        style={{ border: '1px solid rgba(201,169,110,0.2)', background: 'rgba(201,169,110,0.05)', color: 'var(--home-gold-text)' }}
      >
        {label}
      </div>
    </motion.div>
  )
}

/* ─── Animated counter ─── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${Math.round(v)}${suffix}`)
  const [display, setDisplay] = useState(`0${suffix}`)

  useEffect(() => {
    const controls = animate(count, target, { duration: 2, ease: 'easeOut' })
    const unsub = rounded.on('change', setDisplay)
    return () => { controls.stop(); unsub() }
  }, [count, target, rounded])

  return <span>{display}</span>
}

const particles = [
  { label: 'React', x: 8, y: 18, delay: 0 },
  { label: 'System Design', x: 78, y: 12, delay: 1.2 },
  { label: 'Algorithms', x: 85, y: 55, delay: 0.6 },
  { label: 'TypeScript', x: 12, y: 65, delay: 1.8 },
  { label: 'Go', x: 72, y: 78, delay: 2.4 },
  { label: 'Database', x: 22, y: 82, delay: 0.9 },
  { label: 'Network', x: 90, y: 35, delay: 1.5 },
  { label: 'OS', x: 5, y: 42, delay: 2.1 },
]

const quickTopics = [
  '机器学习基础', '微积分', '量子力学', '认知心理学',
  '经济学原理', '计算机网络', '设计模式', '西方哲学史',
]

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } },
  item: { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } },
}

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const startLearning = async (topic: string) => {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) return
    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await treeApi.create(trimmedTopic)
      if (response.data.success && response.data.data) {
        navigate(`/tree/${response.data.data.id}`)
      } else {
        setErrorMessage(response.data.error || '创建失败，请稍后重试')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '创建失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    const value = inputRef.current?.value?.trim()
    if (value) startLearning(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleQuickTopic = (topic: string) => {
    if (inputRef.current) inputRef.current.value = topic
    startLearning(topic)
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--home-bg)', color: 'var(--home-text)' }}
    >
      <NoiseOverlay />
      <AmbientBackground />

      {/* ─── Header ─── */}
      <Navbar />

      {/* ─── Hero ─── */}
      <main className="relative z-10">
        <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative">
          {particles.map((p) => (
            <FloatingNode key={p.label} {...p} />
          ))}

          <motion.div
            className="max-w-3xl mx-auto px-6 text-center"
            variants={stagger.container}
            initial="hidden"
            animate="visible"
          >
            {/* Eyebrow */}
            <motion.div variants={stagger.item} className="mb-6">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-outfit tracking-widest uppercase"
                style={{ border: '1px solid rgba(201,169,110,0.2)', background: 'rgba(201,169,110,0.05)', color: 'var(--home-gold-text)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                AI 驱动的知识学习
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={stagger.item} className="font-playfair text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              <span style={{ color: 'var(--home-text)' }}>构建你的</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-gold">
                知识图谱
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={stagger.item} className="font-outfit text-lg sm:text-xl max-w-xl mx-auto mb-12 leading-relaxed font-light" style={{ color: 'var(--home-text-sub)' }}>
              输入学习主题，AI 为你生成结构化知识图谱与学习路径
            </motion.p>

            {/* Search bar */}
            <motion.div variants={stagger.item} className="relative max-w-xl mx-auto mb-8">
              <div
                className="relative rounded-2xl transition-all duration-500"
                style={{
                  boxShadow: inputFocused
                    ? '0 0 40px rgba(201,169,110,0.2)'
                    : '0 4px 24px rgba(0,0,0,0.06)',
                }}
              >
                {/* Animated border */}
                <div
                  className="absolute -inset-px rounded-2xl transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(to right, rgba(201,169,110,0.3), rgba(201,169,110,0.1), rgba(201,169,110,0.3))',
                    opacity: inputFocused ? 1 : 0.4,
                  }}
                />

                <div
                  className="relative flex items-center rounded-2xl overflow-hidden"
                  style={{ background: 'var(--home-input-bg)', border: '1px solid rgba(201,169,110,0.2)' }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="输入你想学习的主题，如「机器学习基础」"
                    className="flex-1 bg-transparent px-6 py-4 font-outfit text-base focus:outline-none"
                    style={{ color: 'var(--home-text)', ['--placeholder-color' as string]: 'var(--home-text-sub)' }}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="m-2 px-6 py-2.5 bg-gradient-to-r from-gold to-gold-dark font-outfit font-medium text-sm rounded-xl flex items-center gap-2 hover:brightness-110 transition-all duration-300 active:scale-95 disabled:opacity-50"
                    style={{ color: 'var(--home-btn-text)' }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        开始
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Error message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto mb-6 px-4 py-3 rounded-xl text-sm text-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {errorMessage}
              </motion.div>
            )}

            {/* Quick topics */}
            <motion.div variants={stagger.item} className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {quickTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleQuickTopic(topic)}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 text-xs font-outfit rounded-lg transition-all duration-300 disabled:opacity-30"
                  style={{ color: 'var(--home-text-sub)', border: '1px solid var(--home-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--home-gold-text)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--home-text-sub)'; e.currentTarget.style.borderColor = 'var(--home-border)' }}
                >
                  {topic}
                </button>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ─── Features ─── */}
        <section className="py-32 relative">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={stagger.container}
            >
              {[
                { num: '01', title: 'AI 智能规划', desc: '大语言模型深度分析学习主题，生成个性化知识拓扑' },
                { num: '02', title: '知识树可视化', desc: '交互式树形结构，层层展开知识脉络，一目了然' },
                { num: '03', title: '深度学习辅助', desc: '针对每个知识节点自动生成学习文章与练习题' },
              ].map((f) => (
                <motion.div
                  key={f.num}
                  variants={stagger.item}
                  className="group relative p-8 rounded-2xl transition-all duration-500"
                  style={{ background: 'var(--home-card-bg)', border: '1px solid var(--home-card-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--home-card-hover)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--home-card-bg)'; e.currentTarget.style.borderColor = 'var(--home-card-border)' }}
                >
                  <span className="font-playfair text-sm" style={{ color: 'rgba(201,169,110,0.3)' }}>{f.num}</span>
                  <h3 className="font-playfair text-xl mt-4 mb-3" style={{ color: 'var(--home-text)' }}>{f.title}</h3>
                  <p className="font-outfit text-sm leading-relaxed" style={{ color: 'var(--home-text-sub)' }}>{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section className="py-24" style={{ borderTop: '1px solid var(--home-border-light)' }}>
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <motion.div
              className="grid grid-cols-3 gap-8 text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger.container}
            >
              {[
                { value: 1000, suffix: '+', label: '知识节点' },
                { value: 50, suffix: '+', label: '学科领域' },
                { value: 98, suffix: '%', label: '用户满意度' },
              ].map((s) => (
                <motion.div key={s.label} variants={stagger.item}>
                  <div className="font-playfair text-4xl sm:text-5xl mb-2" style={{ color: 'var(--home-gold-text)' }}>
                    <Counter target={s.value} suffix={s.suffix} />
                  </div>
                  <div className="font-outfit text-sm" style={{ color: 'var(--home-text-sub)' }}>{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-32">
          <motion.div
            className="max-w-2xl mx-auto px-6 text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-playfair text-3xl sm:text-4xl mb-4" style={{ color: 'var(--home-text)' }}>
              准备好了吗？
            </h2>
            <p className="font-outfit mb-10" style={{ color: 'var(--home-text-sub)' }}>
              从一个学习主题开始，让 AI 为你构建完整的知识体系
            </p>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setTimeout(() => inputRef.current?.focus(), 600)
              }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gold to-gold-dark font-outfit font-medium rounded-xl hover:brightness-110 transition-all duration-300 active:scale-95"
              style={{ color: 'var(--home-btn-text)' }}
            >
              开始构建知识图谱
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </section>
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
