import type { Node } from './node'

export type TreeMode = 'understanding' | 'interview'

export interface Tree {
  id: string
  root_topic: string
  description: string
  /** 模式：understanding = 理解模式，interview = 面试模式（树的属性，创建时固定） */
  mode?: TreeMode
  created_at: string
  updated_at: string
  root_node?: Node
  nodes?: Node[]
}
