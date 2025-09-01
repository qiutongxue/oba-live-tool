// retry.ts
import type { ScopedLogger } from '#/logger' // 假设你有这个类型
import { sleep } from '#/utils'

export interface RetryOptions {
  maxRetries: number
  retryDelay: number
  logger?: ScopedLogger
  onRetryError?: (err: unknown, attempt: number) => void
  shouldRetry?: (err: unknown, attempt: number) => boolean
}

export async function runWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxRetries,
    retryDelay,
    logger,
    onRetryError,
    shouldRetry = () => true,
  } = options

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      logger?.warn(`第 ${attempt + 1}/${maxRetries} 次执行失败：${String(err)}`)
      onRetryError?.(err, attempt)

      const isLast = attempt >= maxRetries - 1
      const canRetry = shouldRetry(err, attempt)

      if (isLast || !canRetry) {
        throw new Error(`达到最大重试次数，任务失败：${String(err)}`)
      }

      await sleep(retryDelay)
    }
  }

  throw new Error('Unexpected retry flow')
}
