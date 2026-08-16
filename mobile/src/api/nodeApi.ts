import client from './client'
import type { ApiResponse, Article, Question, TreeNode } from '../types'

export interface ExpandNodePayload {
  topic: string
  level: string
  model?: string | null
}

export const nodeApi = {
  getById: (id: string) => client.get<ApiResponse<TreeNode>>(`/nodes/${id}`),

  delete: (id: string) => client.delete(`/nodes/${id}`),

  deleteChildren: (id: string) => client.delete(`/nodes/${id}/children`),

  /** AI 展开节点：生成一批子节点 */
  expand: (id: string, payload: ExpandNodePayload) =>
    client.post<ApiResponse<TreeNode[]>>(`/nodes/${id}/expand`, payload),

  /* ---- 文章 ---- */
  getArticle: (nodeId: string) => client.get<ApiResponse<Article | null>>(`/nodes/${nodeId}/article`),

  generateArticle: (nodeId: string, topic?: string, model?: string) =>
    client.post<ApiResponse<Article>>(`/nodes/${nodeId}/article`, { topic, model }),

  regenerateArticle: (nodeId: string, topic?: string, model?: string) =>
    client.post<ApiResponse<Article>>(`/nodes/${nodeId}/article/regenerate`, { topic, model }),

  deleteArticle: (nodeId: string) => client.delete(`/nodes/${nodeId}/article`),

  /* ---- 练习题 ---- */
  getQuestions: (nodeId: string) => client.get<ApiResponse<Question[]>>(`/nodes/${nodeId}/questions`),

  generateQuestion: (nodeId: string, topic?: string, model?: string) =>
    client.post<ApiResponse<Question>>(`/nodes/${nodeId}/questions`, { topic, model }),
}
