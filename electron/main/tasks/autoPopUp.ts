import { merge } from 'lodash-es'
import type { Page } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import type { Account } from '#/taskManager'
import { LiveController } from '#/tasks/controller/LiveController'
import { randomInt, takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import type { BaseConfig } from './scheduler'
import { TaskScheduler } from './scheduler'

const TASK_NAME = '自动弹窗'

export interface PopUpConfig extends BaseConfig {
  goodsIds: number[]
  random?: boolean
}

export class PopUpManager {
  private currentGoodIndex = 0
  private config: PopUpConfig
  private readonly scheduler: TaskScheduler
  private controller: LiveController
  private logger: ReturnType<typeof createLogger>
  private abortController = new AbortController()

  constructor(
    private readonly page: Page,
    private account: Account,
    userConfig: PopUpConfig,
  ) {
    this.logger = createLogger(`${TASK_NAME} @${account.name}`)
    this.validateConfig(userConfig)
    this.config = userConfig
    this.scheduler = this.createTaskScheduler()
    this.controller = new LiveController(
      page,
      this.logger,
      this.abortController.signal,
    )
  }

  private createTaskScheduler() {
    return new TaskScheduler(
      TASK_NAME,
      (...args) => this.execute(...args),
      merge({}, this.config.scheduler, {
        onStart: () => {
          this.logger.info('任务开始执行')
        },
        onStop: () => {
          this.logger.info('任务停止执行')
          this.abortController.abort()
          windowManager.send(
            IPC_CHANNELS.tasks.autoPopUp.stoppedEvent,
            this.account.id,
          )
        },
      }),
      this.logger,
    )
  }

  private async execute(screenshot = false) {
    try {
      const goodsId = this.getNextGoodsId()
      await this.controller.popUp(goodsId)
    } catch (error) {
      // this.logger.error(
      //   `执行失败: ${error instanceof Error ? error.message : String(error)}`,
      // )
      if (screenshot) {
        await takeScreenshot(this.page, TASK_NAME, this.account.name).catch(e =>
          this.logger.debug(`截图失败：${e}`),
        )
      }
      throw error
    }
  }

  private getNextGoodsId(): number {
    if (this.config.random) {
      this.currentGoodIndex = randomInt(0, this.config.goodsIds.length - 1)
    } else {
      this.currentGoodIndex =
        (this.currentGoodIndex + 1) % this.config.goodsIds.length
    }
    return this.config.goodsIds[this.currentGoodIndex]
  }

  private validateConfig(userConfig: PopUpConfig) {
    if (userConfig.goodsIds.length === 0)
      throw new Error('商品配置验证失败: 必须提供至少一个商品ID')

    if (userConfig.scheduler.interval[0] > userConfig.scheduler.interval[1])
      throw new Error('配置验证失败：计时器区间设置错误')
    this.logger.info(
      `商品配置验证通过，共加载 ${userConfig.goodsIds.length} 个商品`,
    )
  }

  public start() {
    this.scheduler.start()
  }

  public stop() {
    this.scheduler.stop()
  }

  public updateConfig(newConfig: Partial<PopUpConfig>) {
    try {
      const config = merge({}, this.config, newConfig)
      this.validateConfig(config)
      if (newConfig.scheduler)
        this.scheduler.updateConfig({ scheduler: newConfig.scheduler })
      this.config = config
      // 更新配置后重新启动任务
      this.scheduler.restart()
    } catch (error) {
      this.logger.error(
        `「${TASK_NAME}」配置更新失败: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }

  public get isRunning() {
    return this.scheduler.isRunning
  }
}
