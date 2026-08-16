/* ===== TopoKnow 移动端类型定义（独立于 Web 端） ===== */

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/* ---- 树 ---- */
export type TreeMode = 'understanding' | 'interview'

export interface TreeNode {
  id: string
  tree_id: string
  parent_id: string | null
  topic: string
  description: string
  importance: 'high' | 'medium' | 'low'
  difficulty: number
  depth: number
  position_order: number
  created_at: string
  updated_at: string
  has_article?: boolean
  question_count?: number
}

export interface Tree {
  id: string
  root_topic: string
  description: string
  mode?: TreeMode
  created_at: string
  updated_at: string
  root_node?: TreeNode
  nodes?: TreeNode[]
}

/* ---- 文章 / 练习题 ---- */
export interface Article {
  id: string
  node_id: string
  title: string
  content: string
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

/* ---- 提示词 ---- */
export interface Prompt {
  id: string
  name: string
  category: string
  description: string
  template: string
  variables: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/* ---- AI 模型 ---- */
export interface AIModel {
  id: string
  provider: string
  display_name: string
}

export interface ModelsResponse {
  models: AIModel[]
  default_model: string
}

/* ---- 批量生成 ---- */
export type BatchItemType = 'generate_nodes' | 'generate_article'
export type BatchItemStatus = 'pending' | 'running' | 'completed' | 'failed'
export type BatchTaskStatus = 'running' | 'cancelled' | 'completed'

export interface BatchQueueItem {
  id: string
  task_id: string
  type: BatchItemType
  node_id: string
  layer: number
  tree_depth: number
  layer_group: string
  parent_topic?: string
  node_topic?: string
  status: BatchItemStatus
  error?: string
  nodes_created?: number
}

export interface BatchGenTask {
  id: string
  tree_id: string
  root_node_id: string
  target_layers: number
  model_id: string
  status: BatchTaskStatus
  created_at: string
  total_items: number
  completed_items: number
  failed_items: number
}

export interface BatchGenStartRequest {
  node_id: string
  layers: number
  model?: string
}

export interface BatchSSEEvent {
  type: string
  payload: Record<string, unknown>
  event_id: number
}
