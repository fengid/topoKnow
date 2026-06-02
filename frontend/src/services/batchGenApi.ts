import type { ApiResponse } from '@/types'
import type { BatchGenTask, BatchGenStartRequest, QueueItem } from '@/types/batchGen'
import client from './client'

export const batchGenApi = {
  start: (treeId: string, req: BatchGenStartRequest) =>
    client.post<ApiResponse<BatchGenTask>>(`/trees/${treeId}/batch-gen/start`, req),

  cancel: (treeId: string) =>
    client.post<ApiResponse<null>>(`/trees/${treeId}/batch-gen/cancel`),

  retry: (treeId: string, itemId: string) =>
    client.post<ApiResponse<null>>(`/trees/${treeId}/batch-gen/retry/${itemId}`),

  status: (treeId: string) =>
    client.get<ApiResponse<{ task: BatchGenTask; items: QueueItem[] }>>(`/trees/${treeId}/batch-gen/status`),
}
