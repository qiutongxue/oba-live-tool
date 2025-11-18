import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { AbortError } from '#/errors/AppError'
import type { ScopedLogger } from '#/logger'
import type { IPerformPopup } from '#/platforms/IPlatform'
import {
  errorMessage,
  mergeWithoutArray,
  randomInt,
  takeScreenshot,
} from '#/utils'
import windowManager from '#/windowManager'
import { createIntervalTask } from './IntervalTask'
import { runWithRetry } from './retry'

const TASK_NAME = '自动弹窗'

const retryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
}

export function createAutoPopupTask(
  platform: IPerformPopup,
  taskConfig: AutoPopupConfig,
  account: Account,
  _logger: ScopedLogger,
) {
  const logger = _logger.scope(TASK_NAME)
  let arrayIndex = -1
  let config = { ...taskConfig }

  async function execute(signal: AbortSignal) {
    const result = await runWithRetry(
      async () => {
        if (signal.aborted) {
          return Result.fail(new AbortError())
        }
        const goodsId = getNextGoodsId()
        const result = await platform.performPopup(goodsId)
        if (Result.isSuccess(result)) {
          logger.success(`商品 ${goodsId} 讲解成功`)
        }
        return result
      },
      {
        ...retryOptions,
        logger,
        onRetryError: () =>
          Result.pipe(
            platform.getPopupPage(),
            Result.map(page => takeScreenshot(page, TASK_NAME, account.name)),
          ),
      },
    )
    if (Result.isFailure(result)) {
      windowManager.send(IPC_CHANNELS.tasks.autoPopUp.stoppedEvent, account.id)
    }
    return result
  }

  function getNextGoodsId(): number {
    if (config.random) {
      arrayIndex = randomInt(0, config.goodsIds.length - 1)
    } else {
      arrayIndex = (arrayIndex + 1) % config.goodsIds.length
    }
    return config.goodsIds[arrayIndex]
  }

  function updateConfig(newConfig: Partial<AutoPopupConfig>) {
    try {
      const mergedConfig = mergeWithoutArray(config, newConfig)
      validateConfig(mergedConfig)
      if (newConfig.scheduler?.interval)
        intervalTask.updateInterval(config.scheduler.interval)
      config = mergedConfig
      // 更新配置后重新启动任务
      intervalTask.restart()
    } catch (error) {
      logger.error(`配置更新失败: ${errorMessage(error)}`)
      throw error
    }
  }

  function validateConfig(userConfig: AutoPopupConfig) {
    intervalTask.validateInterval(userConfig.scheduler.interval)
    if (userConfig.goodsIds.length === 0)
      throw new Error('商品配置验证失败: 必须提供至少一个商品ID')

    logger.info(`商品配置验证通过，共加载 ${userConfig.goodsIds.length} 个商品`)
  }

  const intervalTask = createIntervalTask(execute, {
    interval: config.scheduler.interval,
    taskName: TASK_NAME,
    logger,
  })

  return {
    ...intervalTask,
    updateConfig,
  }
}
