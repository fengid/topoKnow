import client from './client'
import type { ApiResponse, Article, Prompt, Question, Tree, TreeNode } from '../types'

export type DbTableName = 'trees' | 'nodes' | 'articles' | 'questions' | 'prompts'

export type DbRecord = Tree | TreeNode | Article | Question | Prompt

export const databaseApi = {
  async getAll(table: DbTableName): Promise<DbRecord[]> {
    const res = await client.get<ApiResponse<DbRecord[]>>(`/${table}`)
    return res.data.data ?? []
  },

  async delete(table: DbTableName, id: string): Promise<void> {
    await client.delete(`/${table}/${id}`)
  },
}
