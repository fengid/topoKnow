import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export interface SheetAction {
  key: string
  label: string
  icon: ReactNode
  danger?: boolean
  onPress: () => void
}

interface ActionSheetProps {
  open: boolean
  title?: string
  desc?: string
  actions: SheetAction[]
  onClose: () => void
}

export default function ActionSheet({ open, title, desc, actions, onClose }: ActionSheetProps) {
  if (!open) return null

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        {title && <div className="sheet__title">{title}</div>}
        {desc && <div className="sheet__desc ellipsis">{desc}</div>}
        <div className="sheet__body">
          {actions.map((action) => (
            <button
              key={action.key}
              className={`action-row${action.danger ? ' danger' : ''}`}
              onClick={() => {
                onClose()
                action.onPress()
              }}
            >
              <span className="action-row__icon">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
        <div style={{ paddingTop: 10 }}>
          <button className="btn btn--ghost btn--block" onClick={onClose}>
            <X size={16} />
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
