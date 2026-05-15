export interface Node {
  id: string
  tree_id: string
  parent_id: string | null
  topic: string
  description: string
  importance: 'high' | 'medium' | 'low'
  difficulty: number
  depth: number
  position_order: number
  is_expanded?: boolean
  children?: Node[]
  created_at: string
  updated_at: string
  has_article?: boolean
  question_count?: number
}

export interface ExpandNodeRequest {
  topic: string
  level: string
  existing_children?: string[]
  model?: string | null
}
