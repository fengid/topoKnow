import client from './client'
import type { ApiResponse, Tree, TreeMode, TreeNode } from '../types'

export const treeApi = {
  getAll: () => client.get<ApiResponse<Tree[]>>('/trees'),

  getById: (id: string) => client.get<ApiResponse<Tree & { root_node: TreeNode }>>(`/trees/${id}`),

  create: (rootTopic: string, mode: TreeMode = 'understanding') =>
    client.post<ApiResponse<Tree>>('/trees', { root_topic: rootTopic, mode }),

  delete: (id: string) => client.delete(`/trees/${id}`),
}
