import api from './client'
import type { TableName, Tree, Node, Question, Article, Prompt, ApiResponse } from '../features/database/types/database'

type TableData = Tree | Node | Question | Article | Prompt

export const databaseApi = {
  async getAll(tableName: TableName): Promise<TableData[]> {
    const endpoint = tableName === 'prompts' ? '/prompts' : `/${tableName}`
    const response = await api.get<ApiResponse<TableData[]>>(endpoint)
    return response.data.data
  },

  async delete(tableName: TableName, id: string): Promise<void> {
    const endpoint = tableName === 'prompts' ? `/prompts/${id}` : `/${tableName}/${id}`
    await api.delete(endpoint)
  },

  async update(tableName: TableName, id: string, data: Partial<TableData>): Promise<TableData> {
    const endpoint = tableName === 'prompts' ? `/prompts/${id}` : `/${tableName}/${id}`
    const response = await api.put<ApiResponse<TableData>>(endpoint, data)
    return response.data.data
  }
}
