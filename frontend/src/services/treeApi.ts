import type { ApiResponse, Tree, Node } from '@/types'
import client from './client'

export const treeApi = {
  getAll: () => client.get<ApiResponse<Tree[]>>('/trees'),

  getById: (id: string) => client.get<ApiResponse<Tree & { root_node: Node }>>(`/trees/${id}`),

  create: (rootTopic: string, promptId?: string) =>
    client.post<ApiResponse<Tree>>('/trees', { root_topic: rootTopic, prompt_id: promptId }),

  delete: (id: string) => client.delete(`/trees/${id}`),
}
