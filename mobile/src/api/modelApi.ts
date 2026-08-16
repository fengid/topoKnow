import client from './client'
import type { ApiResponse, ModelsResponse } from '../types'

export const modelApi = {
  getModels: () => client.get<ApiResponse<ModelsResponse>>('/ai/models'),
}
