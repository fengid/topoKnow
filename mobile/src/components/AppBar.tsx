import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface AppBarProps {
  title: ReactNode
  subtitle?: string
  onBack?: () => void
  backTo?: string
  right?: ReactNode
}

export default function AppBar({ title, subtitle, onBack, backTo, right }: AppBarProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) onBack()
    else if (backTo) navigate(backTo)
    else navigate(-1)
  }

  return (
    <header className="appbar">
      <button className="appbar__back" onClick={handleBack} aria-label="返回">
        <ChevronLeft size={24} />
      </button>
      <div className="appbar__main">
        <div className="appbar__title">{title}</div>
        {subtitle && <div className="appbar__subtitle ellipsis">{subtitle}</div>}
      </div>
      {right && <div className="appbar__right">{right}</div>}
    </header>
  )
}
