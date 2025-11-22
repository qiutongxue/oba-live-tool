// retry.ts

import { Result } from '@praha/byethrow'
import { AbortError, UnexpectedError } from '#/errors/AppError'
import type { ScopedLogger } from '#/logger' // 假设你有这个类型
import { abortableSleep } from '#/utils'

export interface RetryOptions {
  maxRetries: number
  retryDelay: number
  logger?: ScopedLogger
  signal?: AbortSignal
  onRetryError?: (err: unknown, attempt: number) => void
  shouldRetry?: (err: unknown, attempt: number) => boolean
}

export async function runWithRetry<T>(
  fn: () => Promise<Result.Result<T, Error>>,
  options: RetryOptions,
): Promise<Result.Result<T, Error>> {
  const { maxRetries, retryDelay, logger, onRetryError, shouldRetry = () => true } = options

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fn()
    // 被中断后也要终止此次任务
    if (Result.isSuccess(result) || result.error instanceof AbortError) {
      return result
    }
    const err = result.error
    logger?.warn(`第 ${attempt + 1}/${maxRetries} 次执行失败：`, err)
    onRetryError?.(err, attempt)

    const isLast = attempt >= maxRetries - 1
    const canRetry = shouldRetry(err, attempt)

    if (isLast || !canRetry) {
      return result
    }

    const sleepResult = await abortableSleep(retryDelay, options.signal)
    // 被中断
    if (Result.isFailure(sleepResult)) {
      return sleepResult
    }
  }
  return Result.fail(new UnexpectedError({ description: '不可能出现的错误' }))
}
