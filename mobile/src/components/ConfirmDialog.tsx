import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  variant?: 'danger' | 'info'
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  variant = 'danger',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="dialog-mask" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {variant === 'danger' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
              }}
            >
              <AlertTriangle size={22} />
            </span>
          </div>
        )}
        <div className="dialog__title">{title}</div>
        <div className="dialog__msg">{message}</div>
        <div className="dialog__actions">
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn ${variant === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
