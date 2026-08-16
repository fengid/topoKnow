import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  desc?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, desc, action }: EmptyStateProps) {
  return (
    <div className="empty fade-in">
      <div className="empty__icon">{icon}</div>
      <div className="empty__title">{title}</div>
      {desc && <div className="empty__desc">{desc}</div>}
      {action}
    </div>
  )
}
