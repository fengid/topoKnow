import client from './client'
import type { ApiResponse, BatchGenStartRequest, BatchGenTask, BatchQueueItem } from '../types'

export const batchGenApi = {
  start: (treeId: string, req: BatchGenStartRequest) =>
    client.post<ApiResponse<BatchGenTask>>(`/trees/${treeId}/batch-gen/start`, req),

  cancel: (treeId: string) => client.post<ApiResponse<null>>(`/trees/${treeId}/batch-gen/cancel`),

  retry: (treeId: string, itemId: string) =>
    client.post<ApiResponse<null>>(`/trees/${treeId}/batch-gen/retry/${itemId}`),

  status: (treeId: string) =>
    client.get<ApiResponse<{ task: BatchGenTask; items: BatchQueueItem[] }>>(
      `/trees/${treeId}/batch-gen/status`,
    ),
}
