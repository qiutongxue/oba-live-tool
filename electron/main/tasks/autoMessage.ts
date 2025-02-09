import type { Page } from 'playwright'
import type { BaseConfig } from './scheduler'
import { COMMENT_TEXTAREA_SELECTOR, PIN_TOP_SELECTOR, SUBMIT_COMMENT_SELECTOR } from '#/constants'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import { randomInt, type RequiredWith } from '#/utils'
import windowManager from '#/windowManager'
import { ipcMain } from 'electron'
import { merge } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createScheduler } from './scheduler'

const TASK_NAME = '自动发言'
const logger = createLogger(TASK_NAME)

interface MessageConfig extends BaseConfig {
  messages: string[]
  pinTops?: boolean | number[]
  random?: boolean
}

const DEFAULT_CONFIG: RequiredWith<MessageConfig, 'scheduler'> = {
  scheduler: {
    name: TASK_NAME,
    interval: [30000, 60000],
  },
  messages: [],
  random: false,
}

class MessageManager {
  private currentMessageIndex = -1
  private readonly config: RequiredWith<MessageConfig, 'scheduler'>
  private readonly page: Page
  private readonly scheduler: ReturnType<typeof createScheduler>

  constructor(page: Page, userConfig: Partial<MessageConfig> = {}) {
    this.page = page
    this.config = merge({}, DEFAULT_CONFIG, userConfig)
    this.scheduler = this.createTaskScheduler()
    this.validateConfig()
  }

  private createTaskScheduler() {
    return createScheduler(
      () => this.execute(),
      merge(this.config.scheduler, {
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
      await this.sendMessage(message)
    }
    catch (e) {
      logger.error(`「${TASK_NAME}」执行失败: ${e instanceof Error ? e.message : String(e)}`)
      throw e
    }
  }

  private async sendMessage(message: string) {
    const textarea = await this.page.$(COMMENT_TEXTAREA_SELECTOR)
    if (!textarea) {
      throw new Error('找不到评论框，请检查是否开播 | 页面是否在直播中控台')
    }

    await textarea.fill(message)
    const isPinTop = await this.handlePinTop()
    await this.submitMessage()
    logger.success(`发送${isPinTop ? '「置顶」' : ''}消息: ${message}`)
  }

  private async handlePinTop(): Promise<boolean> {
    const { pinTops } = this.config
    if (pinTops === true || (Array.isArray(pinTops) && pinTops.includes(this.currentMessageIndex))) {
      const pinTopLabel = await this.page.$(PIN_TOP_SELECTOR)
      if (!pinTopLabel) {
        throw new Error('找不到置顶按钮，请检查是否开播 | 页面是否在直播中控台')
      }
      await pinTopLabel.click()
      return true
    }
    return false
  }

  private async submitMessage() {
    const submit_btn = await this.page.$(SUBMIT_COMMENT_SELECTOR)
    if (!submit_btn || (await submit_btn.getAttribute('class'))?.includes('isDisabled')) {
      throw new Error('无法点击发布按钮')
    }
    await submit_btn.click()
  }

  private validateConfig() {
    if (this.config.messages.length === 0) {
      throw new Error('消息配置验证失败: 必须提供至少一条消息')
    }

    const badIndex = this.config.messages.findIndex(msg => msg.length > 50)
    if (badIndex >= 0) {
      throw new Error(`消息配置验证失败: 第 ${badIndex + 1} 条消息字数超出 50`)
    }

    if (this.config.scheduler.interval[0] > this.config.scheduler.interval[1]) {
      throw new Error('配置验证失败：计时器区间设置错误')
    }

    logger.info(`消息配置验证通过，共加载 ${this.config.messages.length} 条消息`)
  }

  public start() {
    this.scheduler.start()
  }

  public stop() {
    this.scheduler.stop()
  }

  public updateConfig(newConfig: Partial<MessageConfig>) {
    if (newConfig.scheduler) {
      this.scheduler.updateConfig(newConfig)
    }
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
      pageManager.register('autoMessage', page => new MessageManager(page, config))
      pageManager.startTask('autoMessage')
      return true
    }
    catch (error) {
      logger.error('启动自动发言失败:', error instanceof Error ? error.message : error)
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.stop, async () => {
    pageManager.stopTask('autoMessage')
    return true
  })
}

setupIpcHandlers()

export function createAutoMessage(page: Page, config: Partial<MessageConfig> = {}) {
  return new MessageManager(page, config)
}
