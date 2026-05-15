export type TableName = 'trees' | 'nodes' | 'questions' | 'articles' | 'prompts'

export interface Tree {
  id: string
  root_topic: string
  description: string
  created_at: string
  updated_at: string
}

export interface Node {
  id: string
  tree_id: string
  parent_id: string | null
  topic: string
  description: string
  importance: 'low' | 'medium' | 'high'
  difficulty: number
  depth: number
  position_order: number
  is_expanded: boolean
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  node_id: string
  question: string
  answer: string
  tags: string[]
  source: string
  created_at: string
}

export interface Article {
  id: string
  node_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface Prompt {
  id: string
  name: string
  category: string
  template: string
  variables: string[]
  description: string
  version: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export interface TableConfig {
  name: TableName
  label: string
  icon: string
}
