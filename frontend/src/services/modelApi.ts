import type { ApiResponse, ModelsResponse } from '@/types'
import client from './client'

export const modelApi = {
  getModels: () => client.get<ApiResponse<ModelsResponse>>('/ai/models'),
}
