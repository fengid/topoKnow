import type { Node } from './node'

export interface Tree {
  id: string
  root_topic: string
  description: string
  created_at: string
  updated_at: string
  root_node?: Node
  nodes?: Node[]
}
