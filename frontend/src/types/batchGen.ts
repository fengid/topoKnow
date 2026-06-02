export type ItemType = 'generate_nodes' | 'generate_article'
export type ItemStatus = 'pending' | 'running' | 'completed' | 'failed'
export type TaskStatus = 'running' | 'cancelled' | 'completed'

export interface QueueItem {
  id: string
  task_id: string
  type: ItemType
  node_id: string
  layer: number
  tree_depth: number
  layer_group: string
  parent_topic?: string
  node_topic?: string
  status: ItemStatus
  error?: string
  nodes_created?: number
}

export interface BatchGenTask {
  id: string
  tree_id: string
  root_node_id: string
  target_layers: number
  model_id: string
  status: TaskStatus
  created_at: string
  total_items: number
  completed_items: number
  failed_items: number
}

export interface SSEEvent {
  type: string
  payload: Record<string, unknown>
  event_id: number
}

export interface BatchGenStartRequest {
  node_id: string
  layers: number
  model?: string
}
