import { merge } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import type { ScopedLogger } from '#/logger'
import type { IPerformPopup } from '#/platforms/IPlatform'
import { errorMessage, randomInt, takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import { IntervalTask } from './IntervalTask'
import { runWithRetry } from './retry'

const TASK_NAME = '自动弹窗'

const retryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
}

export class AutoPopupTask extends IntervalTask<AutoPopupTask> {
  private arrayIndex = -1

  constructor(
    protected platform: IPerformPopup,
    private config: AutoPopupConfig,
    private account: Account,
    logger: ScopedLogger,
  ) {
    super({
      taskName: TASK_NAME,
      logger,
      interval: config.scheduler.interval,
    })
  }

  protected async execute() {
    try {
      runWithRetry(
        async () => {
          const goodsId = this.getNextGoodsId()
          await this.platform.performPopup(goodsId)
          this.logger.success(`商品 ${goodsId} 讲解成功`)
        },
        {
          ...retryOptions,
          logger: this.logger,
          onRetryError: () =>
            takeScreenshot(
              this.platform.getPopupPage(),
              TASK_NAME,
              this.account.name,
            ),
        },
      )
    } catch (err) {
      windowManager.send(
        IPC_CHANNELS.tasks.autoPopUp.stoppedEvent,
        this.account.id,
      )
      throw err
    }
  }

  private getNextGoodsId(): number {
    if (this.config.random) {
      this.arrayIndex = randomInt(0, this.config.goodsIds.length - 1)
    } else {
      this.arrayIndex = (this.arrayIndex + 1) % this.config.goodsIds.length
    }
    return this.config.goodsIds[this.arrayIndex]
  }

  public updateConfig(newConfig: Partial<AutoPopupConfig>) {
    try {
      const config = merge({}, this.config, newConfig)
      this.validateConfig(config)
      if (newConfig.scheduler?.interval)
        this.updateInterval(config.scheduler.interval)
      this.config = config
      // 更新配置后重新启动任务
      this.restart()
    } catch (error) {
      this.logger.error(`配置更新失败: ${errorMessage(error)}`)
      throw error
    }
  }

  protected validateConfig(userConfig: AutoPopupConfig) {
    super.validateInterval(userConfig.scheduler.interval)
    if (userConfig.goodsIds.length === 0)
      throw new Error('商品配置验证失败: 必须提供至少一个商品ID')

    this.logger.info(
      `商品配置验证通过，共加载 ${userConfig.goodsIds.length} 个商品`,
    )
  }
}
