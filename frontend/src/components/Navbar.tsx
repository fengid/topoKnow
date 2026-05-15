import { useNavigate } from 'react-router-dom'
import { Home, GitBranch, Database, Sun, Moon, Settings } from 'lucide-react'
import { useThemeStore } from '@/store'

interface NavbarProps {
  subtitle?: string
}

export default function Navbar({ subtitle }: NavbarProps) {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useThemeStore()

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{ borderBottom: '1px solid var(--home-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="font-playfair font-bold text-sm" style={{ color: 'var(--home-btn-text)' }}>AI</span>
            </div>
            <span className="font-playfair text-lg tracking-wide" style={{ color: 'var(--home-text)' }}>知识图谱</span>
            {subtitle && (
              <>
                <span className="mx-2" style={{ color: 'var(--home-border)' }}>·</span>
                <span className="font-outfit text-sm" style={{ color: 'var(--home-text-sub)' }}>
                  {subtitle}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl transition-colors duration-300"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--home-toggle-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="返回首页"
            >
              <Home className="w-5 h-5" style={{ color: 'var(--home-text-sub)' }} />
            </button>
            <button
              onClick={() => navigate('/my-trees')}
              className="p-2.5 rounded-xl transition-colors duration-300"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--home-toggle-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="我的图谱"
            >
              <GitBranch className="w-5 h-5" style={{ color: 'var(--home-text-sub)' }} />
            </button>
            <button
              onClick={() => navigate('/database')}
              className="p-2.5 rounded-xl transition-colors duration-300"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--home-toggle-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="数据库管理"
            >
              <Database className="w-5 h-5" style={{ color: 'var(--home-text-sub)' }} />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2.5 rounded-xl transition-colors duration-300"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--home-toggle-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="模型设置"
            >
              <Settings className="w-5 h-5" style={{ color: 'var(--home-text-sub)' }} />
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl transition-colors duration-300"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--home-toggle-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              aria-label="切换主题"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5" style={{ color: 'var(--home-text-sub)' }} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: 'var(--home-text-sub)' }} />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
