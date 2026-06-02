import { useState, useEffect, useCallback, useRef } from 'react'
import type { BatchGenTask, QueueItem, SSEEvent } from '@/types/batchGen'
import { batchGenApi } from '@/services/api'
import client from '@/services/client'

interface BatchGenState {
  task: BatchGenTask | null
  items: QueueItem[]
  isConnected: boolean
}

interface UseBatchGenReturn extends BatchGenState {
  start: (nodeId: string, layers: number, model?: string) => Promise<void>
  cancel: () => Promise<void>
  retry: (itemId: string) => Promise<void>
  error: string | null
}

export function useBatchGenSSE(treeId: string | undefined): UseBatchGenReturn {
  const [state, setState] = useState<BatchGenState>({
    task: null,
    items: [],
    isConnected: false,
  })
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const applyEvent = useCallback((event: SSEEvent) => {
    setState((prev) => {
      const items = [...prev.items]

      switch (event.type) {
        case 'status_snapshot': {
          const raw = event.payload ?? (event as unknown as Record<string, unknown>)
          return { ...prev, task: raw.task as BatchGenTask | null, items: (raw.items as QueueItem[]) ?? [] }
        }

        case 'task_created': {
          const payload = event.payload as { task_id: string; layers: number }
          if (prev.task) {
            return prev
          }
          return { ...prev, task: { id: payload.task_id, target_layers: payload.layers } as BatchGenTask }
        }

        case 'item_started': {
          const payload = event.payload as { item_id: string }
          const idx = items.findIndex((i) => i.id === payload.item_id)
          if (idx !== -1) {
            const updated = [...items]
            updated[idx] = { ...updated[idx], status: 'running' as const }
            return { ...prev, items: updated }
          }
          return prev
        }

        case 'item_completed': {
          const payload = event.payload as {
            item_id: string
            type: string
            node_id: string
            nodes_created?: number
            node_topic?: string
            parent_topic?: string
          }
          const idx = items.findIndex((i) => i.id === payload.item_id)
          let updatedItems = items
          if (idx !== -1) {
            updatedItems = [...items]
            updatedItems[idx] = {
              ...updatedItems[idx],
              status: 'completed' as const,
              nodes_created: payload.nodes_created ?? updatedItems[idx].nodes_created,
              node_topic: payload.node_topic ?? updatedItems[idx].node_topic,
              parent_topic: payload.parent_topic ?? updatedItems[idx].parent_topic,
            }
          }
          const task = prev.task
          return {
            ...prev,
            items: updatedItems,
            task: task
              ? { ...task, completed_items: task.completed_items + 1 }
              : null,
          }
        }

        case 'item_failed': {
          const payload = event.payload as { item_id: string; error: string }
          const idx = items.findIndex((i) => i.id === payload.item_id)
          if (idx !== -1) {
            const updated = [...items]
            updated[idx] = { ...updated[idx], status: 'failed' as const, error: payload.error }
            const task = prev.task
            return {
              ...prev,
              items: updated,
              task: task
                ? { ...task, failed_items: task.failed_items + 1 }
                : null,
            }
          }
          return prev
        }

        case 'task_completed': {
          const payload = event.payload as { task_id: string; completed: number; failed: number }
          return {
            ...prev,
            task: prev.task
              ? { ...prev.task, status: 'completed' as const, completed_items: payload.completed, failed_items: payload.failed }
              : null,
          }
        }

        case 'task_cancelled': {
          return {
            ...prev,
            task: prev.task ? { ...prev.task, status: 'cancelled' as const } : null,
          }
        }

        case 'progress': {
          const payload = event.payload as { completed: number; total: number; current_layer: number }
          return prev.task
            ? { ...prev, task: { ...prev.task, total_items: payload.total } }
            : prev
        }

        case 'queue_update': {
          const payload = event.payload as {
            total_items: number
            current_layer: number
            next_layer: number
            new_items: QueueItem[]
          }
          const existingIds = new Set(items.map((i) => i.id))
          const addedItems = (payload.new_items ?? []).filter((i) => !existingIds.has(i.id))
          return {
            ...prev,
            items: [...items, ...addedItems],
            task: prev.task
              ? { ...prev.task, total_items: payload.total_items }
              : null,
          }
        }

        case 'item_retry': {
          const payload = event.payload as { item_id: string }
          const idx = items.findIndex((i) => i.id === payload.item_id)
          if (idx !== -1) {
            const updated = [...items]
            updated[idx] = { ...updated[idx], status: 'pending' as const, error: '' }
            return { ...prev, items: updated }
          }
          return prev
        }

        default:
          return prev
      }
    })
  }, [])

  // Fetch current status from server
  const fetchStatus = useCallback(async () => {
    if (!treeId) return
    try {
      const res = await batchGenApi.status(treeId)
      if (res.data.success && res.data.data) {
        const { task, items } = res.data.data
        setState({ task, items, isConnected: true })
      }
    } catch {
      // No active task — that's fine
    }
  }, [treeId])

  // SSE connection management
  useEffect(() => {
    if (!treeId) return

    const connect = () => {
      const baseURL = client.defaults.baseURL || '/api'
      const es = new EventSource(`${baseURL}/trees/${treeId}/batch-gen/stream`)
      eventSourceRef.current = es

      es.onmessage = (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data)
          applyEvent(event)
        } catch {
          // Ignore malformed events
        }
      }

      es.onopen = () => {
        setState((prev) => ({ ...prev, isConnected: true }))
      }

      es.onerror = () => {
        setState((prev) => ({ ...prev, isConnected: false }))
        es.close()
        eventSourceRef.current = null
      }
    }

    // Fetch initial state then connect SSE
    fetchStatus().then(() => connect())

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [treeId, fetchStatus, applyEvent])

  const start = useCallback(async (nodeId: string, layers: number, model?: string) => {
    if (!treeId) return
    setError(null)
    try {
      const res = await batchGenApi.start(treeId, { node_id: nodeId, layers, model })
      if (res.data.success && res.data.data) {
        setState((prev) => ({
          ...prev,
          task: res.data.data!,
        }))
      } else {
        setError(res.data.error || '启动失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动失败')
    }
  }, [treeId])

  const cancel = useCallback(async () => {
    if (!treeId) return
    try {
      await batchGenApi.cancel(treeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败')
    }
  }, [treeId])

  const retry = useCallback(async (itemId: string) => {
    if (!treeId) return
    try {
      await batchGenApi.retry(treeId, itemId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '重试失败')
    }
  }, [treeId])

  return {
    ...state,
    start,
    cancel,
    retry,
    error,
  }
}
