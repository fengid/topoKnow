import type { TreeMode, TreeNode } from '../types'

/** 树模式徽章：理解模式 / 面试模式 */
export function ModeBadge({ mode }: { mode?: TreeMode }) {
  const isInterview = mode === 'interview'
  return (
    <span className={`badge ${isInterview ? 'badge--green' : 'badge--gold'}`}>
      {isInterview ? '面试模式' : '理解模式'}
    </span>
  )
}

/** 节点重要性徽章 */
export function ImportanceBadge({ importance }: { importance: TreeNode['importance'] }) {
  const config = {
    high: { label: '核心', cls: 'badge--red' },
    medium: { label: '重要', cls: 'badge--orange' },
    low: { label: '基础', cls: 'badge--green' },
  } as const
  const c = config[importance] ?? { label: importance, cls: 'badge--plain' }
  return <span className={`badge ${c.cls}`}>{c.label}</span>
}

/** 难度星级 */
export function DifficultyStars({ level }: { level: number }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < level ? 'on' : 'off'}>
          ★
        </span>
      ))}
    </span>
  )
}
