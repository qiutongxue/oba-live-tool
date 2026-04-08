import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { AbortError } from '#/errors/AppError'
import type { ScopedLogger } from '#/logger'
import type { IPerformPopup } from '#/platforms/IPlatform'
import { mergeWithoutArray, randomInt, takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import { createIntervalTask } from './IntervalTask'
import { runWithRetry } from './retry'

const TASK_NAME = '自动弹窗'

const retryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
}

/**
 * 将 goodsItems 展开为执行序列：每个 item 按 repeatCount 展开
 * 返回 { id, interval } 数组
 */
function buildExecutionQueue(config: AutoPopupConfig): { id: number; interval: [number, number] }[] {
  const globalInterval = config.scheduler.interval
  const items = config.goodsItems
  if (!items || items.length === 0) {
    // 兼容旧配置：没有 goodsItems 时用 goodsIds
    return config.goodsIds.map(id => ({ id, interval: globalInterval }))
  }
  const queue: { id: number; interval: [number, number] }[] = []
  for (const item of items) {
    const count = Math.max(1, Math.min(item.repeatCount ?? 1, 10000))
    const interval = item.itemInterval && item.itemInterval[0] > 0 && item.itemInterval[1] > 0
      ? item.itemInterval
      : globalInterval
    for (let i = 0; i < count; i++) {
      queue.push({ id: item.id, interval })
    }
  }
  return queue
}

export function createAutoPopupTask(
  platform: IPerformPopup,
  taskConfig: AutoPopupConfig,
  account: Account,
  _logger: ScopedLogger,
) {
  const logger = _logger.scope(TASK_NAME)
  let config = { ...taskConfig }
  let queue = buildExecutionQueue(config)
  let queueIndex = -1

  const intervalTaskResult = createIntervalTask(execute, {
    interval: config.scheduler.interval,
    taskName: TASK_NAME,
    logger,
  })

  if (Result.isFailure(intervalTaskResult)) {
    return intervalTaskResult
  }

  const intervalTask = intervalTaskResult.value

  async function execute(signal: AbortSignal) {
    const next = getNext()
    // 更新当前执行项的间隔
    intervalTask.updateInterval(next.interval)

    const result = await runWithRetry(
      async () => {
        if (signal.aborted) {
          return Result.fail(new AbortError())
        }
        const result = await platform.performPopup(next.id, signal)
        if (Result.isSuccess(result)) {
          logger.success(`商品 ${next.id} 讲解成功`)
        }
        return result
      },
      {
        ...retryOptions,
        logger,
        signal,
        onRetryError: () => {
          const page = platform.getPopupPage()
          if (page) takeScreenshot(page, TASK_NAME, account.name)
        },
      },
    )
    return result
  }

  function getNext(): { id: number; interval: [number, number] } {
    if (config.random) {
      queueIndex = randomInt(0, queue.length - 1)
    } else {
      queueIndex = (queueIndex + 1) % queue.length
    }
    return queue[queueIndex]
  }

  function validateConfig(userConfig: AutoPopupConfig) {
    return Result.pipe(
      intervalTask.validateInterval(userConfig.scheduler.interval),
      Result.andThen(() => {
        const hasItems = userConfig.goodsItems && userConfig.goodsItems.length > 0
        const hasIds = userConfig.goodsIds.length > 0
        if (!hasItems && !hasIds)
          return Result.fail(new Error('商品配置验证失败: 必须提供至少一个商品ID'))
        return Result.succeed()
      }),
      Result.inspect(() => {
        const q = buildExecutionQueue(userConfig)
        logger.info(`商品配置验证通过，共加载 ${q.length} 个弹窗任务`)
      }),
    )
  }

  function updateConfig(newConfig: Partial<AutoPopupConfig>) {
    const mergedConfig = mergeWithoutArray(config, newConfig)
    return Result.pipe(
      validateConfig(mergedConfig),
      Result.andThen(_ => intervalTask.validateInterval(mergedConfig.scheduler.interval)),
      Result.inspect(() => {
        config = mergedConfig
        queue = buildExecutionQueue(config)
        queueIndex = -1
        // 更新配置后重新启动任务
        intervalTask.restart()
      }),
      Result.inspectError(err => logger.error('配置更新失败：', err)),
    )
  }

  intervalTask.addStopListener(() => {
    windowManager.send(IPC_CHANNELS.tasks.autoPopUp.stoppedEvent, account.id)
  })

  return Result.pipe(
    validateConfig(config),
    Result.map(_ => ({
      ...intervalTask,
      updateConfig,
    })),
  )
}
