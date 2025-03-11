import { ipcMain } from 'electron'
import { merge } from 'lodash-es'
import type { ElementHandle, Page } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import type { Account } from '#/taskManager'
import { pageManager } from '#/taskManager'
import { randomInt } from '#/utils'
import windowManager from '#/windowManager'
import { LiveController, LocalLiveController } from './Controller'
import type { BaseConfig } from './scheduler'
import { TaskScheduler } from './scheduler'

const TASK_NAME = '自动弹窗'
const logger = createLogger(TASK_NAME)

interface PopUpConfig extends BaseConfig {
  goodsIds: number[]
  random?: boolean
}

class PopUpManager {
  private currentGoodIndex = 0
  private config: PopUpConfig
  private readonly scheduler: TaskScheduler
  private controller: LiveController

  constructor(
    private readonly page: Page,
    private account: Account,
    userConfig: PopUpConfig,
    eos?: boolean
  ) {
    this.validateConfig(userConfig)
    this.config = userConfig
    this.scheduler = this.createTaskScheduler()
    this.controller = eos ? new LocalLiveController(page) : new LiveController(page)
  }

  private createTaskScheduler() {
    return new TaskScheduler(
      TASK_NAME,
      () => this.execute(),
      merge({}, this.config.scheduler, {
        onStart: () => logger.info(`「${TASK_NAME}」开始执行`),
        onStop: () => {
          logger.info(`「${TASK_NAME}」停止执行`)
          windowManager.sendToWindow(
            'main',
            IPC_CHANNELS.tasks.autoPopUp.stop,
            this.account.id,
          )
        },
      }),
    )
  }

  private async execute() {
    try {
      const goodsId = this.getNextGoodsId()
      // logger.debug(`准备讲解商品 ID: ${goodsId}`)
      await this.controller.popUp(goodsId)
    } catch (error) {
      logger.error(
        `「${TASK_NAME}」执行失败: ${error instanceof Error ? error.message : String(error)}`,
      )
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

  private async waitForStateChange(element: ElementHandle) {
    await element.waitForSelector('button:not([class*="active"])', {
      timeout: 10000,
    })
  }

  private validateConfig(userConfig: PopUpConfig) {
    if (userConfig.goodsIds.length === 0)
      throw new Error('商品配置验证失败: 必须提供至少一个商品ID')

    if (userConfig.scheduler.interval[0] > userConfig.scheduler.interval[1])
      throw new Error('配置验证失败：计时器区间设置错误')

    logger.info(`商品配置验证通过，共加载 ${userConfig.goodsIds.length} 个商品`)
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
    } catch (error) {
      logger.error(
        `「${TASK_NAME}」配置更新失败: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }

  public get isRunning() {
    return this.scheduler.isRunning
  }
}

// IPC 处理程序
function setupIpcHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.tasks.autoPopUp.start,
    async (_, config: PopUpConfig) => {
      try {
        pageManager.register(
          TASK_NAME,
          (page, account) => new PopUpManager(page, account, config),
        )
        pageManager.startTask(TASK_NAME)
        return true
      } catch (error) {
        logger.error(
          '启动自动弹窗失败:',
          error instanceof Error ? error.message : error,
        )
        return false
      }
    },
  )

  ipcMain.handle(IPC_CHANNELS.tasks.autoPopUp.stop, async () => {
    pageManager.stopTask(TASK_NAME)
  })

  ipcMain.handle(
    IPC_CHANNELS.tasks.autoPopUp.updateConfig,
    async (_, newConfig: PopUpConfig) => {
      pageManager.updateTaskConfig(TASK_NAME, newConfig)
    },
  )
}

setupIpcHandlers()
