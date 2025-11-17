// retry.ts

import { Result } from '@praha/byethrow'
import { UnexpectedError } from '#/errors/AppError'
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
  fn: () => Promise<Result.Result<T, Error>>,
  options: RetryOptions,
): Promise<Result.Result<T, Error>> {
  const {
    maxRetries,
    retryDelay,
    logger,
    onRetryError,
    shouldRetry = () => true,
  } = options

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fn()
    if (Result.isSuccess(result)) {
      return result
    }
    const err = result.error
    logger?.warn(`第 ${attempt + 1}/${maxRetries} 次执行失败：${String(err)}`)
    onRetryError?.(err, attempt)

    const isLast = attempt >= maxRetries - 1
    const canRetry = shouldRetry(err, attempt)

    if (isLast || !canRetry) {
      return result
    }

    await sleep(retryDelay)
  }
  return Result.fail(new UnexpectedError({ description: '不可能出现的错误' }))
}
