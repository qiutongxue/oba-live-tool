import { merge } from 'lodash-es'
import type { Page } from 'playwright'
import type { ScopedLogger } from '#/logger'
import type { IPerformPopup } from '#/platforms/IPlatform'
import { errorMessage, randomInt, takeScreenshot } from '#/utils'
import { IntervalTask } from './IntervalTask'

export class AutoPopupTask extends IntervalTask<AutoPopupTask> {
  static NAME = '自动弹窗'

  private arrayIndex = -1
  private abortController = new AbortController()

  constructor(
    private page: Page,
    protected platform: IPerformPopup,
    private config: AutoPopupConfig,
    private account: Account,
    logger: ScopedLogger,
  ) {
    super({
      taskName: AutoPopupTask.NAME,
      logger: logger.scope(AutoPopupTask.NAME),
      options: {
        maxRetries: 3,
        retryDelay: 1000,
      },
      interval: config.scheduler.interval,
    })
  }

  protected async execute() {
    const goodsId = this.getNextGoodsId()
    await this.platform.performPopup(goodsId)
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
      // this.validateConfig(config)
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

  protected onRetryError(): void {
    takeScreenshot(this.page, AutoPopupTask.NAME, this.account.name)
  }
}
