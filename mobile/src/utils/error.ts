import { AxiosError } from 'axios'

interface ApiErrorBody {
  success?: boolean
  error?: string
  message?: string
}

/**
 * 从 axios 异常中提取后端返回的真实错误信息。
 * 后端约定：失败时返回 `{success:false, error:"原因"}`（如 "API key not configured"），
 * 直接用 err.message 只能看到 "Request failed with status code 500"。
 */
export function extractApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorBody | undefined
    return data?.error || data?.message || err.message || fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}
