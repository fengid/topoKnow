import type { ApiResponse, Node, Article, Question, ExpandNodeRequest } from '@/types'
import client from './client'

export const nodeApi = {
  getById: (id: string) => client.get<ApiResponse<Node>>(`/nodes/${id}`),

  delete: (id: string) => client.delete(`/nodes/${id}`),

  deleteChildren: (id: string) => client.delete(`/nodes/${id}/children`),

  updateExpanded: (id: string, isExpanded: boolean) =>
    client.patch<ApiResponse<Node>>(`/nodes/${id}/expanded`, { is_expanded: isExpanded }),

  expand: (id: string, request: ExpandNodeRequest, model?: string) =>
    client.post<ApiResponse<Node[]>>(`/nodes/${id}/expand`, { ...request, model }),

  // Article API
  getArticle: (nodeId: string) => client.get<ApiResponse<Article | null>>(`/nodes/${nodeId}/article`),

  generateArticle: (nodeId: string, topic?: string, model?: string) =>
    client.post<ApiResponse<Article>>(`/nodes/${nodeId}/article`, { topic, model }),

  deleteArticle: (nodeId: string) =>
    client.delete(`/nodes/${nodeId}/article`),

  regenerateArticle: (nodeId: string, topic?: string, model?: string) =>
    client.post<ApiResponse<Article>>(`/nodes/${nodeId}/article/regenerate`, { topic, model }),

  // Question API
  getQuestions: (nodeId: string) => client.get<ApiResponse<Question[]>>(`/nodes/${nodeId}/questions`),

  generateQuestion: (nodeId: string, topic?: string, model?: string) =>
    client.post<ApiResponse<Question>>(`/nodes/${nodeId}/questions`, { topic, model }),
}
