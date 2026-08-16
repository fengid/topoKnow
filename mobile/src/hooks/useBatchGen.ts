import { useCallback, useEffect, useRef, useState } from 'react'
import { batchGenApi } from '../api/batchGenApi'
import { extractApiError } from '../utils/error'
import type { BatchGenTask, BatchQueueItem, BatchSSEEvent } from '../types'

interface BatchGenState {
  task: BatchGenTask | null
  items: BatchQueueItem[]
  isConnected: boolean
}

/**
 * 批量生成 SSE 订阅：
 * 首次挂载先拉取一次 status 快照，再建立 EventSource 增量更新。
 */
export function useBatchGen(treeId: string | undefined) {
  const [state, setState] = useState<BatchGenState>({ task: null, items: [], isConnected: false })
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const applyEvent = useCallback((event: BatchSSEEvent) => {
    setState((prev) => {
      const items = [...prev.items]

      switch (event.type) {
        case 'status_snapshot': {
          const raw = event.payload ?? (event as unknown as Record<string, unknown>)
          return {
            ...prev,
            task: (raw.task as BatchGenTask | null) ?? null,
            items: (raw.items as BatchQueueItem[]) ?? [],
          }
        }
        case 'task_created': {
          if (prev.task) return prev
          const p = event.payload as { task_id: string; layers: number }
          return { ...prev, task: { id: p.task_id, target_layers: p.layers } as BatchGenTask }
        }
        case 'item_started': {
          const p = event.payload as { item_id: string }
          const idx = items.findIndex((i) => i.id === p.item_id)
          if (idx === -1) return prev
          items[idx] = { ...items[idx], status: 'running' }
          return { ...prev, items }
        }
        case 'item_completed': {
          const p = event.payload as {
            item_id: string
            nodes_created?: number
            node_topic?: string
            parent_topic?: string
          }
          const idx = items.findIndex((i) => i.id === p.item_id)
          let updated = items
          if (idx !== -1) {
            updated = [...items]
            updated[idx] = {
              ...updated[idx],
              status: 'completed',
              nodes_created: p.nodes_created ?? updated[idx].nodes_created,
              node_topic: p.node_topic ?? updated[idx].node_topic,
              parent_topic: p.parent_topic ?? updated[idx].parent_topic,
            }
          }
          return {
            ...prev,
            items: updated,
            task: prev.task
              ? { ...prev.task, completed_items: prev.task.completed_items + 1 }
              : null,
          }
        }
        case 'item_failed': {
          const p = event.payload as { item_id: string; error: string }
          const idx = items.findIndex((i) => i.id === p.item_id)
          if (idx === -1) return prev
          items[idx] = { ...items[idx], status: 'failed', error: p.error }
          return {
            ...prev,
            items,
            task: prev.task
              ? { ...prev.task, failed_items: prev.task.failed_items + 1 }
              : null,
          }
        }
        case 'task_completed': {
          const p = event.payload as { task_id: string; completed: number; failed: number }
          return {
            ...prev,
            task: prev.task
              ? {
                  ...prev.task,
                  status: 'completed',
                  completed_items: p.completed,
                  failed_items: p.failed,
                }
              : null,
          }
        }
        case 'task_cancelled':
          return {
            ...prev,
            task: prev.task ? { ...prev.task, status: 'cancelled' } : null,
          }
        case 'progress': {
          // 防御性同步总数：后端 total 变化通常伴随 queue_update，此事件作兑底
          const p = event.payload as { completed: number; total: number; current_layer: number }
          return prev.task ? { ...prev, task: { ...prev.task, total_items: p.total } } : prev
        }
        case 'queue_update': {
          const p = event.payload as { total_items: number; new_items: BatchQueueItem[] }
          const existing = new Set(items.map((i) => i.id))
          const added = (p.new_items ?? []).filter((i) => !existing.has(i.id))
          return {
            ...prev,
            items: [...items, ...added],
            task: prev.task ? { ...prev.task, total_items: p.total_items } : null,
          }
        }
        case 'item_retry': {
          const p = event.payload as { item_id: string }
          const idx = items.findIndex((i) => i.id === p.item_id)
          if (idx === -1) return prev
          items[idx] = { ...items[idx], status: 'pending', error: '' }
          return { ...prev, items }
        }
        default:
          return prev
      }
    })
  }, [])

  useEffect(() => {
    if (!treeId) return

    let es: EventSource | null = null
    let closed = false

    const connect = () => {
      es = new EventSource(`/api/trees/${treeId}/batch-gen/stream`)
      esRef.current = es
      es.onopen = () => setState((prev) => ({ ...prev, isConnected: true }))
      es.onmessage = (e) => {
        try {
          applyEvent(JSON.parse(e.data) as BatchSSEEvent)
        } catch {
          /* 忽略非法事件 */
        }
      }
      // 断线不主动 close：手机锁屏/切后台/网络抖动会触发 onerror，
      // 浏览器 EventSource 会自动重连，且后端建连时会重推 status_snapshot
      // 完整重新同步任务状态，无需手动补拉。
      es.onerror = () => {
        setState((prev) => ({ ...prev, isConnected: false }))
      }
    }

    // 先取快照再连 SSE，保证恢复页面时能看到进行中的任务
    batchGenApi
      .status(treeId)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setState({ task: res.data.data.task, items: res.data.data.items, isConnected: true })
        }
      })
      .catch(() => void 0)
      .finally(() => {
        if (!closed) connect()
      })

    return () => {
      closed = true
      es?.close()
      esRef.current = null
    }
  }, [treeId, applyEvent])

  const start = useCallback(
    async (nodeId: string, layers: number, model?: string) => {
      if (!treeId) return
      setError(null)
      try {
        const res = await batchGenApi.start(treeId, { node_id: nodeId, layers, model })
        if (res.data.success && res.data.data) {
          setState((prev) => ({ ...prev, task: res.data.data! }))
        } else {
          setError(res.data.error || '启动失败')
        }
      } catch (err) {
        setError(extractApiError(err, '启动失败'))
      }
    },
    [treeId],
  )

  const cancel = useCallback(async () => {
    if (!treeId) return
    try {
      await batchGenApi.cancel(treeId)
    } catch (err) {
      setError(extractApiError(err, '取消失败'))
    }
  }, [treeId])

  const retry = useCallback(
    async (itemId: string) => {
      if (!treeId) return
      try {
        await batchGenApi.retry(treeId, itemId)
      } catch (err) {
        setError(extractApiError(err, '重试失败'))
      }
    },
    [treeId],
  )

  const dismiss = useCallback(() => {
    setState({ task: null, items: [], isConnected: false })
  }, [])

  return { ...state, error, start, cancel, retry, dismiss }
}
