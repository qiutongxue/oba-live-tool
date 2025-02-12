import type { Page } from 'playwright'
import type { BaseConfig } from './scheduler'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import { randomInt } from '#/utils'
import windowManager from '#/windowManager'
import { ipcMain } from 'electron'
import { merge } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { LiveController } from './Controller'
import { TaskScheduler } from './scheduler'

const TASK_NAME = '自动发言'
const logger = createLogger(TASK_NAME)

interface MessageConfig extends BaseConfig {
  messages: string[]
  pinTops?: boolean | number[]
  random?: boolean
}

class MessageManager {
  private currentMessageIndex = -1
  private config: MessageConfig
  private readonly scheduler: TaskScheduler
  private controller: LiveController

  constructor(page: Page, userConfig: MessageConfig) {
    this.validateConfig(userConfig)
    this.config = userConfig
    this.scheduler = this.createTaskScheduler()
    this.controller = new LiveController(page)
  }

  private createTaskScheduler() {
    return new TaskScheduler(
      TASK_NAME,
      () => this.execute(),
      merge({}, this.config.scheduler, {
        onStart: () => logger.info(`「${TASK_NAME}」开始执行`),
        onStop: () => {
          logger.info(`「${TASK_NAME}」停止执行`)
          windowManager.sendToWindow('main', IPC_CHANNELS.tasks.autoMessage.stop)
        },
      }),
    )
  }

  private getNextMessage(): string {
    if (this.config.random) {
      this.currentMessageIndex = randomInt(0, this.config.messages.length - 1)
    }
    else {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.config.messages.length
    }
    return this.config.messages[this.currentMessageIndex]
  }

  private async execute() {
    try {
      const message = this.getNextMessage()
      const isPinTop = this.config.pinTops === true || (Array.isArray(this.config.pinTops) && this.config.pinTops.includes(this.currentMessageIndex))
      await this.controller.sendMessage(message, isPinTop)
    }
    catch (e) {
      logger.error(`「${TASK_NAME}」执行失败: ${e instanceof Error ? e.message : String(e)}`)
      throw e
    }
  }

  private validateConfig(userConfig: MessageConfig) {
    if (userConfig.messages.length === 0) {
      throw new Error('消息配置验证失败: 必须提供至少一条消息')
    }

    const badIndex = userConfig.messages.findIndex(msg => msg.length > 50)
    if (badIndex >= 0) {
      throw new Error(`消息配置验证失败: 第 ${badIndex + 1} 条消息字数超出 50`)
    }

    if (userConfig.scheduler.interval[0] > userConfig.scheduler.interval[1]) {
      throw new Error('配置验证失败：计时器区间设置错误')
    }

    logger.info(`消息配置验证通过，共加载 ${userConfig.messages.length} 条消息`)
  }

  public start() {
    this.scheduler.start()
  }

  public stop() {
    this.scheduler.stop()
  }

  public updateConfig(newConfig: Partial<MessageConfig>) {
    const config = merge({}, this.config, newConfig)
    this.validateConfig(config)
    if (config.scheduler) {
      this.scheduler.updateConfig({ scheduler: config.scheduler })
    }
    this.config = config
  }

  public get currentMessage() {
    if (this.config.messages.length === 0) {
      return ''
    }
    return this.config.messages[Math.max(0, this.currentMessageIndex)]
  }

  public get isRunning() {
    return this.scheduler.isRunning
  }
}

// IPC 处理程序
function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.start, async (_, config) => {
    try {
      pageManager.register(TASK_NAME, page => new MessageManager(page, config))
      pageManager.startTask(TASK_NAME)
      return true
    }
    catch (error) {
      logger.error('启动自动发言失败:', error instanceof Error ? error.message : error)
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.stop, async () => {
    pageManager.stopTask(TASK_NAME)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.updateConfig, async (_, newConfig) => {
    pageManager.updateTaskConfig(TASK_NAME, newConfig)
  })
}

setupIpcHandlers()
