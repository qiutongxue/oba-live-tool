import { merge } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import type { ScopedLogger } from '#/logger'
import type { IPerformPopup } from '#/platforms/IPlatform'
import { errorMessage, randomInt, takeScreenshot } from '#/utils'
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

  async function execute() {
    try {
      await runWithRetry(
        async () => {
          const goodsId = getNextGoodsId()
          await platform.performPopup(goodsId)
          logger.success(`商品 ${goodsId} 讲解成功`)
        },
        {
          ...retryOptions,
          logger,
          onRetryError: () =>
            takeScreenshot(platform.getPopupPage(), TASK_NAME, account.name),
        },
      )
    } catch (err) {
      windowManager.send(IPC_CHANNELS.tasks.autoPopUp.stoppedEvent, account.id)
      throw err
    }
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
      const mergedConfig = merge({}, config, newConfig)
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
