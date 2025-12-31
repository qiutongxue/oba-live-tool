import { useCallback } from 'react'
import { useToast } from './useToast'

/**
 * 统一的错误处理 Hook
 * 用于在应用中统一处理错误，包括日志记录和用户提示
 */
export function useErrorHandler() {
  const { toast } = useToast()

  /**
   * 处理错误
   * @param error - 错误对象或错误消息
   * @param message - 可选的自定义错误提示消息
   */
  const handleError = useCallback(
    (error: unknown, message?: string) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const displayMessage = message || errorMessage

      // 记录错误到控制台
      console.error('错误:', error)

      // 显示错误提示给用户
      toast.error(displayMessage)
    },
    [toast],
  )

  /**
   * 异步操作包装器，自动处理错误
   * @param asyncFn - 异步函数
   * @param errorMessage - 可选的自定义错误提示消息
   * @returns 包装后的异步函数
   */
  const withErrorHandling = useCallback(
    <T extends unknown[], R>(asyncFn: (...args: T) => Promise<R>, errorMessage?: string) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          return await asyncFn(...args)
        } catch (error) {
          handleError(error as Error, errorMessage)
          return undefined
        }
      }
    },
    [handleError],
  )

  return {
    handleError,
    withErrorHandling,
  }
}
